// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./RiskToken.sol";
import "./IRiskToken.sol";

/// @title CoverMax
/// @notice A decentralized insurance protocol with tradeable risk tokens and time-based lifecycle phases
contract RiskVault is Ownable, ReentrancyGuard {
    /* Protocol Phases */
    enum Phase {
        DEPOSIT,      // Phase 1: Deposit Period (2 days)
        COVERAGE,       // Phase 2: Active Coverage Period (3 days) 
        CLAIMS,       // Phase 3: Claims Period (1 day)
        FINAL_CLAIMS  // Phase 4: Final Claims Period (1 day)
    }

    /* Core Protocol Assets */
    address public immutable seniorToken; // CM-Senior token contract
    address public immutable juniorToken; // CM-Junior token contract
    address public immutable aUSDC; // AUSDC yield token
    address public immutable cUSDT; // CUSDT yield token

    /* Protocol Constants */
    uint256 private constant MIN_DEPOSIT_AMOUNT = 10; // Minimum deposit threshold
    uint256 private constant DEPOSIT_PHASE_DURATION = 2 days;
    uint256 private constant COVERAGE_PHASE_DURATION = 3 days;
    uint256 private constant SENIOR_CLAIMS_DURATION = 1 days;
    uint256 private constant FINAL_CLAIMS_DURATION = 1 days;

    /* Protocol State */
    uint256 public totalTokensIssued; // Total CM-Senior + CM-Junior tokens outstanding
    bool public emergencyMode; // Emergency mode flag for prioritized withdrawals
    
    /* Lifecycle Management */
    Phase public currentPhase; // Current protocol phase
    uint256 public phaseStartTime; // When current phase started
    uint256 public cycleStartTime; // When the current cycle started

    /* Vault Balances */
    uint256 public aUSDCBalance; // Total aUSDC held in vault
    uint256 public cUSDTBalance; // Total cUSDT held in vault

    /* Custom Errors */
    error InsufficientDepositAmount();
    error UnevenDepositAmount();
    error UnsupportedAsset();
    error InvalidAssetAddress();
    error NoTokensToWithdraw();
    error NoFundsToWithdraw();
    error TransferOperationFailed();
    error InsufficientTokenBalance();
    error EmergencyModeActive();
    error EmergencyModeNotActive();
    error InvalidPhaseForDeposit();
    error InvalidPhaseForWithdrawal();
    error OnlySeniorTokensAllowed();
    error PhaseTransitionNotReady();
    error EqualAmountsRequired();

    /* Protocol Events */
    event AssetDeposited(address indexed depositor, address indexed asset, uint256 amount, uint256 tokensIssued);
    event TokensWithdrawn(address indexed withdrawer, uint256 seniorAmount, uint256 juniorAmount, uint256 aUSDCAmount, uint256 cUSDTAmount);
    event EmergencyWithdrawal(address indexed withdrawer, uint256 seniorAmount, address preferredAsset, uint256 amount);
    event EmergencyModeToggled(bool emergencyMode);
    event PhaseTransitioned(uint8 indexed fromPhase, uint8 indexed toPhase, uint256 timestamp);
    event CycleStarted(uint256 indexed cycleNumber, uint256 startTime);

    constructor(address _aUSDC, address _cUSDT) Ownable(msg.sender) {
        if (_aUSDC == address(0) || _cUSDT == address(0)) revert InvalidAssetAddress();
        aUSDC = _aUSDC;
        cUSDT = _cUSDT;
        
        // Deploy CM tokens and transfer ownership to this vault
        RiskToken _seniorToken = new RiskToken("CoverMax Senior Token", "CM-SENIOR");
        RiskToken _juniorToken = new RiskToken("CoverMax Junior Token", "CM-JUNIOR");
        
        // Transfer ownership to this vault for proper access control
        _seniorToken.transferOwnership(address(this));
        _juniorToken.transferOwnership(address(this));
        
        seniorToken = address(_seniorToken);
        juniorToken = address(_juniorToken);
        
        // Initialize lifecycle - start in DEPOSIT phase
        currentPhase = Phase.DEPOSIT;
        phaseStartTime = block.timestamp;
        cycleStartTime = block.timestamp;
        
        emit CycleStarted(1, block.timestamp);
        emit PhaseTransitioned(0, uint8(Phase.DEPOSIT), block.timestamp);
    }

    /* Access Control Modifiers */
    modifier whenNotEmergency() {
        if (emergencyMode) revert EmergencyModeActive();
        _;
    }

    modifier onlyDuringPhase(Phase requiredPhase) {
        _updatePhaseIfNeeded();
        if (currentPhase != requiredPhase) {
            if (requiredPhase == Phase.DEPOSIT) revert InvalidPhaseForDeposit();
            else revert InvalidPhaseForWithdrawal();
        }
        _;
    }

    modifier onlyDuringPhases(Phase phase1, Phase phase2) {
        _updatePhaseIfNeeded();
        if (currentPhase != phase1 && currentPhase != phase2) {
            revert InvalidPhaseForWithdrawal();
        }
        _;
    }

    // Phase Management
    /**
     * @dev Updates the current phase based on elapsed time
     */
    function _updatePhaseIfNeeded() internal {
        uint256 timeElapsed = block.timestamp - phaseStartTime;
        Phase oldPhase = currentPhase;
        
        if (currentPhase == Phase.DEPOSIT && timeElapsed >= DEPOSIT_PHASE_DURATION) {
            currentPhase = Phase.COVERAGE;
            phaseStartTime = block.timestamp;
            emit PhaseTransitioned(uint8(oldPhase), uint8(currentPhase), block.timestamp);
        } else if (currentPhase == Phase.COVERAGE && timeElapsed >= COVERAGE_PHASE_DURATION) {
            currentPhase = Phase.CLAIMS;
            phaseStartTime = block.timestamp;
            emit PhaseTransitioned(uint8(oldPhase), uint8(currentPhase), block.timestamp);
        } else if (currentPhase == Phase.CLAIMS && timeElapsed >= SENIOR_CLAIMS_DURATION) {
            currentPhase = Phase.FINAL_CLAIMS;
            phaseStartTime = block.timestamp;
            emit PhaseTransitioned(uint8(oldPhase), uint8(currentPhase), block.timestamp);
        }
    }

    /**
     * @dev Manually trigger phase transition (owner only for emergency situations)
     */
    function forcePhaseTransition() external onlyOwner {
        _updatePhaseIfNeeded();
    }

    /**
     * @dev Immediately force next phase transition regardless of time (owner only for testing/emergency)
     */
    function forcePhaseTransitionImmediate() external onlyOwner {
        Phase oldPhase = currentPhase;
        
        if (currentPhase == Phase.DEPOSIT) {
            currentPhase = Phase.COVERAGE;
            phaseStartTime = block.timestamp;
            emit PhaseTransitioned(uint8(oldPhase), uint8(currentPhase), block.timestamp);
        } else if (currentPhase == Phase.COVERAGE) {
            currentPhase = Phase.CLAIMS;
            phaseStartTime = block.timestamp;
            emit PhaseTransitioned(uint8(oldPhase), uint8(currentPhase), block.timestamp);
        } else if (currentPhase == Phase.CLAIMS) {
            currentPhase = Phase.FINAL_CLAIMS;
            phaseStartTime = block.timestamp;
            emit PhaseTransitioned(uint8(oldPhase), uint8(currentPhase), block.timestamp);
        }
        // Note: FINAL_CLAIMS requires startNewCycle() to reset to DEPOSIT
    }

    /**
     * @dev Start a new cycle - resets to DEPOSIT phase
     */
    function startNewCycle() external onlyOwner {
        _updatePhaseIfNeeded();
        if (currentPhase != Phase.FINAL_CLAIMS) revert PhaseTransitionNotReady();
        
        // Check if final claims period has ended
        uint256 timeElapsed = block.timestamp - phaseStartTime;
        if (timeElapsed < FINAL_CLAIMS_DURATION) revert PhaseTransitionNotReady();
        
        Phase oldPhase = currentPhase;
        currentPhase = Phase.DEPOSIT;
        phaseStartTime = block.timestamp;
        cycleStartTime = block.timestamp;
        
        emit PhaseTransitioned(uint8(oldPhase), uint8(currentPhase), block.timestamp);
        emit CycleStarted(2, block.timestamp); // Simplified cycle counting
    }

    // Asset Management
    /**
     * @dev Validates if an asset is supported
     * @param asset The asset address to validate
     * @return isSupported True if the asset is supported
     */
    function _isAssetSupported(address asset) internal view returns (bool isSupported) {
        return asset == aUSDC || asset == cUSDT;
    }

    /**
     * @dev Gets total value locked in the vault
     * @return totalValue The combined value of all deposited assets
     */
    function _getTotalVaultValue() internal view returns (uint256 totalValue) {
        return aUSDCBalance + cUSDTBalance;
    }

    // Token Management
    /**
     * @dev Issues CM tokens (equal amounts of senior and junior)
     * @param recipient Address to receive the newly issued tokens
     * @param totalAmount Total token amount to issue (split equally between senior/junior)
     */
    function _issueTokens(address recipient, uint256 totalAmount) internal {
        uint256 eachTokenAmount = totalAmount / 2; // Equal split
        IRiskToken(seniorToken).mint(recipient, eachTokenAmount);
        IRiskToken(juniorToken).mint(recipient, eachTokenAmount);
        totalTokensIssued += totalAmount;
    }

    /**
     * @dev Burns CM tokens during withdrawal
     * @param tokenHolder Address whose tokens will be burned
     * @param seniorAmount Amount of senior tokens to burn
     * @param juniorAmount Amount of junior tokens to burn
     */
    function _burnTokens(
        address tokenHolder,
        uint256 seniorAmount,
        uint256 juniorAmount
    ) internal {
        uint256 totalToBurn = seniorAmount + juniorAmount;
        if (totalToBurn == 0) revert NoTokensToWithdraw();

        if (seniorAmount > 0) {
            if (IRiskToken(seniorToken).balanceOf(tokenHolder) < seniorAmount) {
                revert InsufficientTokenBalance();
            }
            IRiskToken(seniorToken).burn(tokenHolder, seniorAmount);
        }
        if (juniorAmount > 0) {
            if (IRiskToken(juniorToken).balanceOf(tokenHolder) < juniorAmount) {
                revert InsufficientTokenBalance();
            }
            IRiskToken(juniorToken).burn(tokenHolder, juniorAmount);
        }

        totalTokensIssued -= totalToBurn;
    }

    /**
     * @dev Calculates proportional withdrawal amounts based on token amounts
     * @param totalTokensToWithdraw Total tokens being withdrawn
     * @return aUSDCAmount Amount of aUSDC to withdraw
     * @return cUSDTAmount Amount of cUSDT to withdraw
     */
    function _calculateWithdrawalAmounts(uint256 totalTokensToWithdraw)
        internal
        view
        returns (uint256 aUSDCAmount, uint256 cUSDTAmount)
    {
        if (totalTokensIssued == 0) return (0, 0);
        
        // Proportional withdrawal based on vault composition
        uint256 totalVaultValue = _getTotalVaultValue();
        uint256 userShare = (totalTokensToWithdraw * totalVaultValue) / totalTokensIssued;
        
        // Calculate proportional amounts
        if (totalVaultValue > 0) {
            aUSDCAmount = (userShare * aUSDCBalance) / totalVaultValue;
            cUSDTAmount = (userShare * cUSDTBalance) / totalVaultValue;
        }
    }

    /**
     * @dev Calculates withdrawal amount for a specific asset
     * @param totalTokensToWithdraw Total tokens being withdrawn
     * @param preferredAsset The specific asset to withdraw
     * @return withdrawAmount Amount of the preferred asset to withdraw
     */
    function _calculateSingleAssetWithdrawal(uint256 totalTokensToWithdraw, address preferredAsset)
        internal
        view
        returns (uint256 withdrawAmount)
    {
        if (totalTokensIssued == 0) return 0;
        if (!_isAssetSupported(preferredAsset)) return 0;
        
        // Calculate user's share of total vault value
        uint256 totalVaultValue = _getTotalVaultValue();
        uint256 userShare = (totalTokensToWithdraw * totalVaultValue) / totalTokensIssued;
        
        // Check if we have enough of the preferred asset
        uint256 assetBalance = preferredAsset == aUSDC ? aUSDCBalance : cUSDTBalance;
        
        // Return the minimum of user's share or available asset balance
        withdrawAmount = userShare > assetBalance ? assetBalance : userShare;
    }

    // Admin Functions
    /**
     * @dev Toggles emergency mode for prioritized senior withdrawals
     */
    function toggleEmergencyMode() external onlyOwner {
        emergencyMode = !emergencyMode;
        emit EmergencyModeToggled(emergencyMode);
    }

    // Core Vault Functions
    /**
     * @dev Deposits yield-bearing assets to get CM tokens (only during DEPOSIT phase)
     * @param asset The yield-bearing asset to deposit (aUSDC or cUSDT)
     * @param depositAmount Amount of asset to deposit
     */
    function depositAsset(address asset, uint256 depositAmount)
        external
        onlyDuringPhase(Phase.DEPOSIT)
        whenNotEmergency
        nonReentrant
    {
        if (depositAmount <= MIN_DEPOSIT_AMOUNT) revert InsufficientDepositAmount();
        if (depositAmount & 1 != 0) revert UnevenDepositAmount(); // Must be even for equal token split
        if (!_isAssetSupported(asset)) revert UnsupportedAsset();

        // Transfer asset from depositor
        if (!IERC20(asset).transferFrom(msg.sender, address(this), depositAmount)) {
            revert TransferOperationFailed();
        }

        // Update vault balances
        if (asset == aUSDC) {
            aUSDCBalance += depositAmount;
        } else {
            cUSDTBalance += depositAmount;
        }

        // Issue CM tokens (equal amounts of senior and junior)
        _issueTokens(msg.sender, depositAmount);
        
        emit AssetDeposited(msg.sender, asset, depositAmount, depositAmount);
    }


    /**
     * @dev Withdraws tokens during any phase with specific conditions
     * @param seniorAmount Amount of senior tokens to withdraw
     * @param juniorAmount Amount of junior tokens to withdraw
     * @param preferredAsset Optional: specific asset to withdraw (address(0) for proportional split)
     */
    function withdraw(uint256 seniorAmount, uint256 juniorAmount, address preferredAsset)
        external
        whenNotEmergency
        nonReentrant
    {
        // Update phase to ensure we have current phase information
        _updatePhaseIfNeeded();
        
        uint256 totalTokensToWithdraw = seniorAmount + juniorAmount;
        if (totalTokensToWithdraw == 0) revert NoTokensToWithdraw();

        // Check phase-specific withdrawal conditions
        if (currentPhase == Phase.CLAIMS && emergencyMode) {
            // During senior claims in emergency mode, only senior tokens allowed
            if (juniorAmount > 0) revert OnlySeniorTokensAllowed();
        } else if (currentPhase != Phase.CLAIMS && currentPhase != Phase.FINAL_CLAIMS) {
            // During DEPOSIT and COVERAGE phases, require equal amounts
            if (seniorAmount != juniorAmount) {
                revert EqualAmountsRequired();
            }
        }
        // During SENIOR_CLAIMS (non-emergency) and FINAL_CLAIMS phases, any combination is allowed

        uint256 aUSDCAmount;
        uint256 cUSDTAmount;

        if (preferredAsset == address(0)) {
            // Proportional withdrawal across both assets
            (aUSDCAmount, cUSDTAmount) = _calculateWithdrawalAmounts(totalTokensToWithdraw);
            
            if (aUSDCAmount == 0 && cUSDTAmount == 0) revert NoFundsToWithdraw();

            // Update vault balances
            aUSDCBalance -= aUSDCAmount;
            cUSDTBalance -= cUSDTAmount;

            // Transfer assets back to user
            if (aUSDCAmount > 0) {
                if (!IERC20(aUSDC).transfer(msg.sender, aUSDCAmount)) {
                    revert TransferOperationFailed();
                }
            }
            if (cUSDTAmount > 0) {
                if (!IERC20(cUSDT).transfer(msg.sender, cUSDTAmount)) {
                    revert TransferOperationFailed();
                }
            }
        } else {
            // Single asset withdrawal
            if (!_isAssetSupported(preferredAsset)) revert UnsupportedAsset();
            
            uint256 withdrawAmount = _calculateSingleAssetWithdrawal(totalTokensToWithdraw, preferredAsset);
            if (withdrawAmount == 0) revert NoFundsToWithdraw();

            // Update vault balance for the specific asset
            if (preferredAsset == aUSDC) {
                aUSDCBalance -= withdrawAmount;
                aUSDCAmount = withdrawAmount;
            } else {
                cUSDTBalance -= withdrawAmount;
                cUSDTAmount = withdrawAmount;
            }

            // Transfer the preferred asset to user
            if (!IERC20(preferredAsset).transfer(msg.sender, withdrawAmount)) {
                revert TransferOperationFailed();
            }
        }

        // Burn the tokens
        _burnTokens(msg.sender, seniorAmount, juniorAmount);

        emit TokensWithdrawn(msg.sender, seniorAmount, juniorAmount, aUSDCAmount, cUSDTAmount);
    }

    /**
     * @dev Emergency withdrawal for senior token holders (can choose preferred asset)
     * @param seniorAmount Amount of senior tokens to withdraw
     * @param preferredAsset Asset to withdraw (aUSDC or cUSDT) - the one that didn't lose value
     */
    function emergencyWithdraw(uint256 seniorAmount, address preferredAsset)
        external
        nonReentrant
    {
        if (!emergencyMode) revert EmergencyModeNotActive();
        if (seniorAmount == 0) revert NoTokensToWithdraw();
        if (!_isAssetSupported(preferredAsset)) revert UnsupportedAsset();

        // Only senior tokens can be used in emergency withdrawal
        uint256 seniorBalance = IRiskToken(seniorToken).balanceOf(msg.sender);
        if (seniorBalance < seniorAmount) revert InsufficientTokenBalance();

        // Calculate withdrawal amount for preferred asset
        uint256 withdrawAmount;
        if (totalTokensIssued > 0) {
            uint256 totalVaultValue = _getTotalVaultValue();
            withdrawAmount = (seniorAmount * totalVaultValue) / totalTokensIssued;
            
            // Ensure we don't withdraw more than available in preferred asset
            if (preferredAsset == aUSDC) {
                withdrawAmount = withdrawAmount > aUSDCBalance ? aUSDCBalance : withdrawAmount;
            } else {
                withdrawAmount = withdrawAmount > cUSDTBalance ? cUSDTBalance : withdrawAmount;
            }
        }

        if (withdrawAmount == 0) revert NoFundsToWithdraw();

        // Burn only senior tokens
        _burnTokens(msg.sender, seniorAmount, 0);

        // Update vault balance
        if (preferredAsset == aUSDC) {
            aUSDCBalance -= withdrawAmount;
        } else {
            cUSDTBalance -= withdrawAmount;
        }

        // Transfer preferred asset to user
        if (!IERC20(preferredAsset).transfer(msg.sender, withdrawAmount)) {
            revert TransferOperationFailed();
        }

        emit EmergencyWithdrawal(msg.sender, seniorAmount, preferredAsset, withdrawAmount);
    }


    // View Functions
    /**
     * @dev Gets user's token balances
     * @param user The user address
     * @return seniorBalance Amount of senior tokens held
     * @return juniorBalance Amount of junior tokens held
     */
    function getUserTokenBalances(address user) external view returns (
        uint256 seniorBalance,
        uint256 juniorBalance
    ) {
        return (
            IRiskToken(seniorToken).balanceOf(user),
            IRiskToken(juniorToken).balanceOf(user)
        );
    }

    /**
     * @dev Calculates withdrawal amounts for given token amounts
     * @param seniorAmount Amount of senior tokens
     * @param juniorAmount Amount of junior tokens
     * @return aUSDCAmount Amount of aUSDC that would be withdrawn
     * @return cUSDTAmount Amount of cUSDT that would be withdrawn
     */
    function calculateWithdrawalAmounts(uint256 seniorAmount, uint256 juniorAmount)
        external
        view
        returns (uint256 aUSDCAmount, uint256 cUSDTAmount)
    {
        uint256 totalTokens = seniorAmount + juniorAmount;
        return _calculateWithdrawalAmounts(totalTokens);
    }

    /**
     * @dev Calculates withdrawal amount for a specific asset
     * @param seniorAmount Amount of senior tokens
     * @param juniorAmount Amount of junior tokens
     * @param preferredAsset The asset to withdraw (aUSDC or cUSDT)
     * @return withdrawAmount Amount of the preferred asset that would be withdrawn
     */
    function calculateSingleAssetWithdrawal(uint256 seniorAmount, uint256 juniorAmount, address preferredAsset)
        external
        view
        returns (uint256 withdrawAmount)
    {
        uint256 totalTokens = seniorAmount + juniorAmount;
        return _calculateSingleAssetWithdrawal(totalTokens, preferredAsset);
    }

    /**
     * @dev Gets total value locked in the vault
     * @return totalValue Combined value of all deposited assets
     */
    function getTotalValueLocked() external view returns (uint256 totalValue) {
        return _getTotalVaultValue();
    }

    /**
     * @dev Gets vault balances for both assets
     * @return aUSDCVaultBalance Amount of aUSDC in vault
     * @return cUSDTVaultBalance Amount of cUSDT in vault
     */
    function getVaultBalances() external view returns (
        uint256 aUSDCVaultBalance,
        uint256 cUSDTVaultBalance
    ) {
        return (aUSDCBalance, cUSDTBalance);
    }

    /**
     * @dev Checks if an asset is supported
     * @param asset The asset address to check
     * @return supported True if the asset is supported
     */
    function isAssetSupported(address asset) external view returns (bool supported) {
        return _isAssetSupported(asset);
    }

    /**
     * @dev Gets protocol status including current phase
     * @return emergency Whether emergency mode is active
     * @return totalTokens Total CM tokens issued
     * @return phase Current protocol phase (0=DEPOSIT, 1=COVERAGE, 2=SENIOR_CLAIMS, 3=FINAL_CLAIMS)
     * @return phaseEndTime When current phase ends
     */
    function getProtocolStatus() external view returns (
        bool emergency,
        uint256 totalTokens,
        uint8 phase,
        uint256 phaseEndTime
    ) {
        uint256 phaseDuration;
        if (currentPhase == Phase.DEPOSIT) {
            phaseDuration = DEPOSIT_PHASE_DURATION;
        } else if (currentPhase == Phase.COVERAGE) {
            phaseDuration = COVERAGE_PHASE_DURATION;
        } else if (currentPhase == Phase.CLAIMS) {
            phaseDuration = SENIOR_CLAIMS_DURATION;
        } else {
            phaseDuration = FINAL_CLAIMS_DURATION;
        }
        
        return (
            emergencyMode, 
            totalTokensIssued, 
            uint8(currentPhase),
            phaseStartTime + phaseDuration
        );
    }

    /**
     * @dev Gets detailed phase information
     * @return phase Current phase
     * @return phaseStart When current phase started
     * @return cycleStart When current cycle started
     * @return timeRemaining Seconds remaining in current phase
     */
    function getPhaseInfo() external view returns (
        uint8 phase,
        uint256 phaseStart,
        uint256 cycleStart,
        uint256 timeRemaining
    ) {
        uint256 phaseDuration;
        if (currentPhase == Phase.DEPOSIT) {
            phaseDuration = DEPOSIT_PHASE_DURATION;
        } else if (currentPhase == Phase.COVERAGE) {
            phaseDuration = COVERAGE_PHASE_DURATION;
        } else if (currentPhase == Phase.CLAIMS) {
            phaseDuration = SENIOR_CLAIMS_DURATION;
        } else {
            phaseDuration = FINAL_CLAIMS_DURATION;
        }
        
        uint256 timeElapsed = block.timestamp - phaseStartTime;
        uint256 remaining = timeElapsed >= phaseDuration ? 0 : phaseDuration - timeElapsed;
        
        return (
            uint8(currentPhase),
            phaseStartTime,
            cycleStartTime,
            remaining
        );
    }
}