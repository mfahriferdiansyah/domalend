//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {console} from "forge-std/Script.sol";
import "forge-std/Script.sol";
import "forge-std/Vm.sol";
import "solidity-bytes-utils/BytesLib.sol";

/**
 * @dev Temp Vm implementation
 * @notice calls the tryffi function on the Vm contract
 * @notice will be deleted once the forge/std is updated
 */
struct FfiResult {
    int32 exit_code;
    bytes stdout;
    bytes stderr;
}

interface tempVm {
    function tryFfi(
        string[] calldata
    ) external returns (FfiResult memory);
}

contract VerifyAll is Script {
    uint96 currTransactionIdx;

    function run(string memory file, string[] memory verifierArgs) external {
        string memory root = vm.projectRoot();
        string memory path;

        if (bytes(file).length != 0) {
            path = string.concat(
                root, "/broadcast/", file, ".s.sol/", vm.toString(block.chainid), "/run-latest.json"
            );
        } else {
            path = string.concat(
                root, "/broadcast/Deploy.s.sol/", vm.toString(block.chainid), "/run-latest.json"
            );
        }

        string memory content = vm.readFile(path);

        while (this.nextTransaction(content)) {
            _verifyIfContractDeployment(content, verifierArgs);
            currTransactionIdx++;
        }
    }

    function _verifyIfContractDeployment(
        string memory content,
        string[] memory verifierArgs
    ) internal {
        string memory txType = abi.decode(
            vm.parseJson(content, searchStr(currTransactionIdx, "transactionType")), (string)
        );
        if (keccak256(bytes(txType)) == keccak256(bytes("CREATE"))) {
            _verifyContract(content, verifierArgs);
        }
    }

    function _verifyContract(string memory content, string[] memory verifierArgs) internal {
        string memory contractName = abi.decode(
            vm.parseJson(content, searchStr(currTransactionIdx, "contractName")), (string)
        );
        address contractAddr = abi.decode(
            vm.parseJson(content, searchStr(currTransactionIdx, "contractAddress")), (address)
        );
        bytes memory deployedBytecode = abi.decode(
            vm.parseJson(content, searchStr(currTransactionIdx, "transaction.input")), (bytes)
        );
        bytes memory compiledBytecode = abi.decode(
            vm.parseJson(_getCompiledBytecode(contractName), ".bytecode.object"), (bytes)
        );
        bytes memory constructorArgs = BytesLib.slice(
            deployedBytecode,
            compiledBytecode.length,
            deployedBytecode.length - compiledBytecode.length
        );
        console.log("constructorArgs", vm.toString(constructorArgs));

        string[] memory inputs = new string[](9 + verifierArgs.length);
        inputs[0] = "forge";
        inputs[1] = "verify-contract";
        inputs[2] = vm.toString(contractAddr);
        inputs[3] = contractName;
        inputs[4] = "--chain";
        inputs[5] = vm.toString(block.chainid);
        inputs[6] = "--constructor-args";
        inputs[7] = vm.toString(constructorArgs);
        inputs[8] = "--watch";

        // append verifierArgs into inputs[9..]
        for (uint256 i = 0; i < verifierArgs.length; i++) {
            inputs[9 + i] = verifierArgs[i];
        }
        FfiResult memory f = tempVm(address(vm)).tryFfi(inputs);

        if (f.stderr.length != 0) {
            console.logString(
                string.concat("Submitting verification for contract: ", vm.toString(contractAddr))
            );
            console.logString(string(f.stderr));
        } else {
            console.logString(string(f.stdout));
        }
        return;
    }

    function nextTransaction(
        string memory content
    ) external view returns (bool) {
        try this.getTransactionFromRaw(content, currTransactionIdx) {
            return true;
        } catch {
            return false;
        }
    }

    function _getCompiledBytecode(
        string memory contractName
    ) internal view returns (string memory compiledBytecode) {
        string memory root = vm.projectRoot();
        string memory path =
            string.concat(root, "/out/", contractName, ".sol/", contractName, ".json");
        compiledBytecode = vm.readFile(path);
    }

    function getTransactionFromRaw(string memory content, uint96 idx) external pure {
        abi.decode(vm.parseJson(content, searchStr(idx, "hash")), (bytes32));
    }

    function searchStr(uint96 idx, string memory searchKey) internal pure returns (string memory) {
        return string.concat(".transactions[", vm.toString(idx), "].", searchKey);
    }
}
