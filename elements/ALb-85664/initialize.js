function(instance, context) {

    const supportedENV = ['rinkeby', 'mainnet', 'ropsten'];
    instance.data.env = 'rinkeby';
    let activeEnv = instance.data.env;
    instance.data.web3;
    instance.data.sdk;

    const normalizeEnvName = name => {
        return name ? name.replace(/ /g, '').toLowerCase() : '';
    }

    const isEnvSupported = name => supportedENV.includes(name);

    const getAddress = (cb) => {
        ethereum.request({ method: 'eth_accounts' }).then(arr => cb(arr[0]));//first account is selected one
    }

    const init = () => {
        instance.data.isWeb3Enabled = (cb) => {
            const isMMinstalled = typeof window.ethereum == 'object';

            if (isMMinstalled) {
                typeof instance.data.web3 === "object" ? '' : instance.data.web3 = new Web3(window.ethereum);//save once
                getAddress((addr) => {
                    if (typeof addr == "string") {
                        instance.data.selectedAddress = addr;
                        return cb(true);
                    }
                    cb(false);
                })
            } else {
                cb(false);
            }
        }

        instance.data.initiateSDK = () => {
            //instance.data.sdk = window.createRaribleSdk(instance.data.web3, instance.data.env);
            const web3Ethereum = new window.raribleWeb3Ethereum.Web3Ethereum({ web3: instance.data.web3 })
            instance.data.sdk = new window.raribleEthereumSdk.createRaribleSdk(web3Ethereum, instance.data.env);
            activeEnv = instance.data.env;
            console.log(`Rarible SDK initiated on ${activeEnv} network`);
            if (instance.data.sdk === 'undefined' || instance.data.sdk === null) console.warn('SDK failed to initialize');
        }

        instance.data.checkSDKandWeb3 = (cb) => {
            instance.publishState('order_stage', '');//reset state
            instance.data.isWeb3Enabled((isEnabled) => {
                if (isEnabled && (typeof instance.data.sdk === 'undefined' || activeEnv != instance.data.env)) {
                    instance.data.initiateSDK()
                }
                return cb(isEnabled);
            })
        }
        instance.data.error = (e, actionType) => {
            // action types: sell, bid, minting, accept bid, buy item
            let actionName = actionType.toLowerCase();
            if (e.code === 4001) {
                instance.publishState('order_stage', 'Canceled');
                actionName && instance.triggerEvent(`${actionName.toLowerCase()}_canceled_by_user`);
            } else {
                console.log(e);
                instance.publishState('order_stage', 'Error');
                actionName && instance.triggerEvent(`error_while_placing_${actionName}`);
            }
        }

        instance.data.generatePromise = () => {
            var result = {
                resolve: function () { return null; },
                reject: function () { return null; },
                promise: function () {
                    return new Promise(function (resolve, reject) {
                        result.resolve = resolve;
                        result.reject = reject;
                    });
                },
            };
            return result;
        }

        instance.data.generateSimpleAction = (actionBuilder, stage) => {
            var promise = instance.data.generatePromise();
            return {
                promise: promise,
                action: actionBuilder.constructor.create(stage),
            };
        }

        instance.data.createOrderRequest = (types, conf) => {
            const { contractNFTAddress, tokenId, orderCreator, price, nftAmount, nftOwner, tradeContractAddress, origin_fees } = conf;
            originFees = origin_fees ? origin_fees : [];
            const { orderType, NFTtype, tradeTokenType } = types;
            const amount = NFTtype == 'ERC721' ? 1 : nftAmount; // For ERC721 always be 1
            const isSell = orderType == 'Sell';
            const actionWithNFT = isSell ? 'makeAssetType' : 'takeAssetType';
            const actionWithTradeToken = isSell ? 'takeAssetType' : 'makeAssetType';
            let request = {
                maker: orderCreator,
                makeAssetType: { assetClass: isSell ? NFTtype : tradeTokenType },
                takeAssetType: { assetClass: isSell ? tradeTokenType : NFTtype },
                price,
                amount,
                originFees,
                payouts: [],
            }

            if (tradeTokenType != 'ETH') {
                request[actionWithTradeToken].contract = tradeContractAddress;
                request[actionWithTradeToken].assetClass = 'ERC20';
            }
            request[actionWithNFT].contract = contractNFTAddress;
            request[actionWithNFT].tokenId = tokenId;
            if (!isSell) request.taker = nftOwner;// taker is needed only when placing a bid

            return request;
        }
    }
    instance.data.setConfig = conf => {
        if (conf) {
            init();// Init main functions only after the plugin element is loaded to avoid undefined errors in some cases
            const { env } = conf;
            const envName = normalizeEnvName(env);
            if (isEnvSupported(envName)) {
                instance.data.env = envName;
                instance.data.checkSDKandWeb3((res) => { });
            } else {
                console.warn(`Selected Environment "${env}" is unsuported or the name is incorrect.`);
            }
        }
    }




    instance.data.runActions = (actionBuilder, order_type) => {
        let stageNr = 0;
        const runNextStage = (i) => {
            const stage = actionBuilder.stages[i];
            const stageName = stage.id;
            instance.publishState('order_stage', stageName);
            const simple = instance.data.generateSimpleAction(actionBuilder, stage);
            const action = simple.action.build();
            action.run(0).then()
            simple.promise.resolve()
            action.result.then((e) => {
                if (typeof e !== 'undefined' && i == actionBuilder.stages.length - 1) {
                    instance.publishState('order_stage', 'Done');
                    instance.publishState('order_hash', e.hash);
                    instance.triggerEvent(`${order_type.toLowerCase()}_order_placed`);
                } else {
                    runNextStage(++stageNr);
                }
            }).catch((e) => { instance.data.error(e, order_type) })
        }
        runNextStage(stageNr);
    }
}