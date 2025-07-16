// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Risk-weighted tokenization for CoverMax Protocol
/// @notice Represents proportional claims on deployed capital with risk stratification
contract RiskToken is ERC20, Ownable {
    constructor(
        string memory tokenName,
        string memory tokenSymbol
    ) ERC20(tokenName, tokenSymbol) Ownable(msg.sender) {}

    function decimals() public pure override returns (uint8) {
        return 18; // Standardized precision for cleaner math
    }

    /// @notice Issues new risk tokens proportional to capital contribution
    /// @dev Only the vault contract can mint new tokens
    /// @param recipient Address to receive the newly minted tokens
    /// @param tokenAmount Quantity of tokens to mint
    function mint(address recipient, uint256 tokenAmount) external onlyOwner {
        _mint(recipient, tokenAmount);
    }

    /// @notice Destroys risk tokens during redemption process
    /// @dev Only the vault contract can burn tokens
    /// @param tokenHolder Address whose tokens will be burned
    /// @param tokenAmount Quantity of tokens to burn
    function burn(address tokenHolder, uint256 tokenAmount) external onlyOwner {
        _burn(tokenHolder, tokenAmount);
    }
}