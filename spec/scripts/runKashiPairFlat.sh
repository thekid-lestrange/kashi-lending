certoraRun spec/harness/KushoPairHarnessFlat.sol spec/harness/DummyERC20A.sol \
	spec/harness/DummyERC20B.sol spec/harness/Swapper.sol spec/harness/SimpleAntiqueBox.sol contracts/mocks/OracleMock.sol spec/harness/DummyWeth.sol spec/harness/WhitelistedSwapper.sol \
	--link KushoPairHarnessFlat:collateral=DummyERC20A KushoPairHarnessFlat:asset=DummyERC20B KushoPairHarnessFlat:antiqueBox=SimpleAntiqueBox KushoPairHarnessFlat:oracle=OracleMock  KushoPairHarnessFlat:masterContract=KushoPairHarnessFlat KushoPairHarnessFlat:whitelistedSwapper=WhitelistedSwapper KushoPairHarnessFlat:redSwapper=Swapper \
	--settings -copyLoopUnroll=4,-b=1,-ignoreViewFunctions,-enableStorageAnalysis=true,-assumeUnwindCond,-recursionEntryLimit=10 \
	--verify KushoPairHarnessFlat:spec/kushoPair.spec \
	--solc_args "['--optimize', '--optimize-runs', '800']" \
	--msg "KushoPairHarnessFlat all rules optimize-runs 800"  
