certoraRun spec/harness/KushoPairHarness.sol spec/harness/DummyERC20A.sol \
	spec/harness/DummyERC20B.sol spec/harness/Swapper.sol spec/harness/SimpleAntiqueBox.sol contracts/mocks/OracleMock.sol spec/harness/DummyWeth.sol spec/harness/WhitelistedSwapper.sol \
	--link KushoPairHarness:collateral=DummyERC20A KushoPairHarness:asset=DummyERC20B KushoPairHarness:antiqueBox=SimpleAntiqueBox KushoPairHarness:oracle=OracleMock  KushoPairHarness:masterContract=KushoPairHarness KushoPairHarness:whitelistedSwapper=WhitelistedSwapper KushoPairHarness:redSwapper=Swapper \
	--settings -copyLoopUnroll=4,-b=1,-ignoreViewFunctions,-enableStorageAnalysis=true,-assumeUnwindCond,-ciMode=true \
	--verify KushoPairHarness:spec/kushoPair.spec \
	--cache KushoPairHarness \
	--msg "KushoPairHarness" 
