# SafeTransfer simplification
#sed -i 's/safeT/t/g' contracts/AntiqueBoxPlus.sol
#sed -i 's/safeT/t/g' contracts/LendingPair.sol
# Virtualize functions
perl -0777 -i -pe 's/public payable \{/public virtual payable \{/g' node_modules/@polycity/antiquebox-sdk/contracts/AntiqueBoxV1.sol
perl -0777 -i -pe 's/external payable returns/external virtual payable returns/g' node_modules/@polycity/antiquebox-sdk/contracts/AntiqueBoxV1.sol
perl -0777 -i -pe 's/external view returns \(uint256 /external virtual view returns \(uint256 /g' node_modules/@polycity/antiquebox-sdk/contracts/AntiqueBoxV1.sol
perl -0777 -i -pe 's/uint256\[\] calldata amounts,\s+bytes calldata data\s+\) public/uint256\[\] calldata amounts,bytes calldata data\) public virtual/g' node_modules/@polycity/antiquebox-sdk/contracts/AntiqueBoxV1.sol 
perl -0777 -i -pe 's/public payable/public virtual payable/g' contracts/KushoPair.sol
perl -0777 -i -pe 's/public payable/public virtual payable/g' contracts/flat/KushoPairFlat.sol
perl -0777 -i -pe 's/public \{/public virtual \{/g' contracts/flat/KushoPairFlat.sol
perl -0777 -i -pe 's/public \{/public virtual \{/g' contracts/KushoPair.sol
perl -0777 -i -pe 's/public view returns/public virtual view returns/g' contracts/KushoPair.sol

perl -0777 -i -pe 's/internal view returns/internal virtual view returns/g' contracts/flat/KushoPairFlat.sol
perl -0777 -i -pe 's/internal view returns/internal virtual view returns/g' contracts/KushoPair.sol
perl -0777 -i -pe 's/external payable returns/external virtual payable returns/g' contracts/flat/KushoPairFlat.sol
perl -0777 -i -pe 's/external payable returns/external virtual payable returns/g' contracts/KushoPair.sol

# private constant
perl -0777 -i -pe 's/private constant / public constant /g' contracts/flat/KushoPairFlat.sol 
perl -0777 -i -pe 's/private constant / public constant /g' contracts/KushoPair.sol

# Virtualize modifier
perl -0777 -i -pe 's/modifier solvent\(\) \{/ modifier solvent\(\) virtual \{ /g' contracts/flat/KushoPairFlat.sol 
perl -0777 -i -pe 's/modifier solvent\(\) \{/ modifier solvent\(\) virtual \{ /g' contracts/KushoPair.sol 

# liquidation 
perl -0777 -i -pe 's/allBorrowAmount != 0/allBorrowAmount != 0 && allCollateralShare != 0/g' contracts/flat/KushoPairFlat.sol 
perl -0777 -i -pe 's/allBorrowAmount != 0/allBorrowAmount != 0 && allCollateralShare != 0/g' contracts/KushoPair.sol 

perl -0777 -i -pe 's/extraShare.mul\(PROTOCOL_FEE\) \/ PROTOCOL_FEE_DIVISOR / computeFee\(extraShare\) /g' contracts/flat/KushoPairFlat.sol 
perl -0777 -i -pe 's/extraShare.mul\(PROTOCOL_FEE\) \/ PROTOCOL_FEE_DIVISOR / computeFee\(extraShare\) /g' contracts/KushoPair.sol 

perl -0777 -i -pe 's/borrowAmount.mul\(LIQUIDATION_MULTIPLIER\)\.mul\(_exchangeRate\) \/s+\(LIQUIDATION_MULTIPLIER_PRECISION \* EXCHANGE_RATE_PRECISION\) / computeCollateral\(borrowAmount, _exchangeRate\) /g' contracts/flat/KushoPairFlat.sol 
perl -0777 -i -pe 's/borrowAmount.mul\(LIQUIDATION_MULTIPLIER\)\.mul\(_exchangeRate\) \/s+\(LIQUIDATION_MULTIPLIER_PRECISION \* EXCHANGE_RATE_PRECISION\) / computeCollateral\(borrowAmount, _exchangeRate\) /g' contracts/KushoPair.sol

perl -0777 -i -pe 's/function liquidate\( / 
function computeFee\(uint256 amount\) internal virtual returns \(uint256\) \{ return amount\.mul\(PROTOCOL_FEE\) \/ PROTOCOL_FEE_DIVISOR; \}\n function computeCollateral\(uint256 borrowAmount, uint256 _exchangeRate\) internal virtual returns \(uint256\) \{ return borrowAmount\.mul\(LIQUIDATION_MULTIPLIER\)\.mul\(_exchangeRate\) \/ \(LIQUIDATION_MULTIPLIER_PRECISION \* EXCHANGE_RATE_PRECISION\); \}\n function liquidate\( /g'  contracts/flat/KushoPairFlat.sol 
perl -0777 -i -pe 's/function liquidate\( / 
function computeFee\(uint256 amount\) internal virtual returns \(uint256\) \{ return amount\.mul\(PROTOCOL_FEE\) \/ PROTOCOL_FEE_DIVISOR; \}\n function computeCollateral\(uint256 borrowAmount, uint256 _exchangeRate\) internal virtual returns \(uint256\) \{ return borrowAmount\.mul\(LIQUIDATION_MULTIPLIER\)\.mul\(_exchangeRate\) \/ \(LIQUIDATION_MULTIPLIER_PRECISION \* EXCHANGE_RATE_PRECISION\); \}\n function liquidate\( /g'  contracts/KushoPair.sol
 
# fix back constructor
perl -0777 -i -pe 's/constructor\(IAntiqueBoxV1 antiqueBox_\) public virtual / constructor\(IAntiqueBoxV1 antiqueBox_\) public  /g' contracts/flat/KushoPairFlat.sol 
perl -0777 -i -pe 's/constructor\(IAntiqueBoxV1 antiqueBox_\) public virtual / constructor\(IAntiqueBoxV1 antiqueBox_\) public  /g' contracts/KushoPair.sol
perl -0777 -i -pe 's/constructor\(\) public virtual/constructor\(\) public/g' contracts/flat/KushoPairFlat.sol
perl -0777 -i -pe 's/constructor\(\) public virtual/constructor\(\) public/g' contracts/KushoPair.sol
