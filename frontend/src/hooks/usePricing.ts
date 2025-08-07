import { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/PrivyWeb3Context';
import { ContractName, getContractAddress } from '@/config/contracts';
import { ethers } from 'ethers';

export const usePricing = () => {
  const {
    seniorTokenAddress,
    juniorTokenAddress,
    getAmountsOut,
    getPairReserves,
    currentChain,
  } = useWeb3();

  const [seniorPrice, setSeniorPrice] = useState('1.00');
  const [juniorPrice, setJuniorPrice] = useState('1.00');
  const [poolReserves, setPoolReserves] = useState({ senior: '0', junior: '0' });

  useEffect(() => {
    const fetchTokenPrices = async () => {
      if (!seniorTokenAddress || !juniorTokenAddress || !getAmountsOut || !currentChain) return;
      
      try {
        // Get pool reserves to calculate proper AMM pricing
        const pairAddress = getContractAddress(currentChain, ContractName.SENIOR_JUNIOR_PAIR);
        const reserves = await getPairReserves(pairAddress);
        const seniorReserve = parseFloat(ethers.formatEther(reserves.reserve0));
        const juniorReserve = parseFloat(ethers.formatEther(reserves.reserve1));
        
        // Calculate prices directly from Uniswap AMM reserves
        const seniorPriceInJunior = juniorReserve / seniorReserve;
        const juniorPriceInSenior = seniorReserve / juniorReserve;
        
        try {
          // Get price of 1 SENIOR in terms of JUNIOR
          const seniorToJuniorPath = [seniorTokenAddress, juniorTokenAddress];
          const seniorPrice1Unit = await getAmountsOut('1', seniorToJuniorPath);
          
          // Get price of 1 JUNIOR in terms of SENIOR
          const juniorToSeniorPath = [juniorTokenAddress, seniorTokenAddress];
          const juniorPrice1Unit = await getAmountsOut('1', juniorToSeniorPath);
          
          setSeniorPrice(parseFloat(seniorPrice1Unit).toFixed(2));
          setJuniorPrice(parseFloat(juniorPrice1Unit).toFixed(2));
        } catch (error) {
          console.error('Error getting AMM prices:', error);
          // Fallback to reserve-based calculation
          setSeniorPrice(seniorPriceInJunior.toFixed(2));
          setJuniorPrice(juniorPriceInSenior.toFixed(2));
        }
      } catch (error) {
        console.error('Error fetching token prices:', error);
        setSeniorPrice('1.00');
        setJuniorPrice('1.00');
      }
    };

    const fetchPoolReserves = async () => {
      if (!getPairReserves || !currentChain) return;
      
      try {
        const pairAddress = getContractAddress(currentChain, ContractName.SENIOR_JUNIOR_PAIR);
        const reserves = await getPairReserves(pairAddress);
        
        const seniorReserve = ethers.formatEther(reserves.reserve0);
        const juniorReserve = ethers.formatEther(reserves.reserve1);
        
        // Only update if values have changed significantly
        const currentSenior = parseFloat(poolReserves.senior);
        const currentJunior = parseFloat(poolReserves.junior);
        const newSenior = parseFloat(seniorReserve);
        const newJunior = parseFloat(juniorReserve);
        
        if (Math.abs(currentSenior - newSenior) > 0.01 || Math.abs(currentJunior - newJunior) > 0.01) {
          setPoolReserves({
            senior: seniorReserve,
            junior: juniorReserve,
          });
        }
      } catch (error) {
        console.error('Error fetching pool reserves:', error);
        if (poolReserves.senior === '0' && poolReserves.junior === '0') {
          setPoolReserves({ senior: '0', junior: '0' });
        }
      }
    };

    fetchTokenPrices();
    fetchPoolReserves();
    const interval = setInterval(() => {
      fetchTokenPrices();
      fetchPoolReserves();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [seniorTokenAddress, juniorTokenAddress, getAmountsOut, getPairReserves, currentChain, poolReserves.senior, poolReserves.junior]);

  return {
    seniorPrice,
    juniorPrice,
    poolReserves,
  };
};