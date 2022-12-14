function(instance, context) {
    //####
    //@ Free Plugin by NovaBloq in partnership with Rarible Protocol
    //@ It can be found in the Rarible official documentation: https://docs.rarible.org/use-cases/bubblesdk/
    //####

    //# ENV namings for SDK
    instance.data.envSDKtypes = {
        "Ethereum - Mainnet": 'prod',
        "Ethereum - Goerli": 'staging',
        "Ethereum - Ropsten": 'dev',
        "Polygon - Mainnet": 'prod',
        "Polygon - Mumbai": 'staging',
        "Tezos - Mainnet": 'prod',
        "Tezos - Hangzhounet": 'dev',
        "Flow - Mainent": 'prod',
        "Flow - Testnet": 'dev'
    }
    //# Namings used in API
    const envAPItypes = {
        "Ethereum - Mainnet": 'ETHEREUM',
        "Ethereum - Goerli": 'ETHEREUM',
        "Ethereum - Ropsten": 'ETHEREUM',
        "Polygon - Mainnet": 'POLYGON',
        "Polygon - Mumbai": 'POLYGON',
        "Tezos - Mainnet": 'TEZOS',
        "Tezos - Hangzhounet": 'TEZOS',
        "Flow - Mainent": 'FLOW',
        "Flow - Testnet": 'FLOW'
    }

    const chainIds = {
        "1": "Ethereum - Mainnet",
        "5": "Ethereum - Goerli",
        "3": "Ethereum - Ropsten",
        "137": "Polygon - Mainnet",
        "80001": "Polygon - Mumbai"
    }

    const rpcUrls = {
        "tezos": {
            "mainnet": "https://mainnet.api.tez.ie/",
            "hangzhounet": "https://hangzhounet.api.tez.ie/"
        },
        "flow": {
            "mainnet": { "accessNode": "https://flow-access-mainnet.portto.io", "wallet": "https://flow-wallet.blocto.app/authn" },
            "devnet": { "accessNode": "https://access-testnet.onflow.org", "wallet": "https://flow-wallet-testnet.blocto.app/authn" }
        }
    }

    //# Plugin global variables
    instance.data.nativeTokens = ["ETH", "XTZ", "MATIC", "FLOW"];
    instance.data.env = 'rinkeby';//default
    let activeEnv = instance.data.env;
    let envFullName;
    instance.data.walletType;
    instance.data.web3;
    instance.data.sdk;
    instance.data.connectionObj;
    instance.data.chainId;
    instance.data.conf;
    instance.data.blockchainName; //used for API calls example: ETHEREUM, POLYGON, TEZOS, FLOW etc.
    instance.data.isNativeToken = (token) => instance.data.nativeTokens.includes(token.toUpperCase().trim());
    instance.data.getUnionItemId = (contractAddress, id) => `${instance.data.blockchainName}:${contractAddress}:${id}`;

    const getAddress = (provider, cb) => {
        provider.request({ method: 'eth_accounts' }).then(arr => cb(arr[0]));
    }
    const buildConnObj = (build_provider, cb) => {
        if (instance.data.blockchainName != 'TEZOS' && instance.data.blockchainName != 'FLOW') {
            const web3Ethereum = new window.Web3Ethereum({ web3: build_provider });
            const ethWallet = new window.EthereumWallet(web3Ethereum, instance.data.blockchainName);
            instance.data.connectionObj = ethWallet;
        } else if (instance.data.blockchainName == 'TEZOS') {
            if (!instance.data.tezos_connector) {
                try {
                    const tezosConnectorEnv = envFullName.substr(8).toLowerCase();
                    const appName = instance.data.conf.app_name ? instance.data.conf.app_name : document.title;
                    if (!window.raribleConnector) {
                        // Prevent creation of multiple connectors when adding more than 1 plugin element on the page
                        window.raribleConnector = window.buildBeaconConnector(appName, rpcUrls.tezos[tezosConnectorEnv], tezosConnectorEnv);
                    } //@ Plugin by NovaBloq (developer - Andrew)
                    instance.data.tezos_connector = window.raribleConnector;
                    window.raribleConnector.connection.subscribe((conn) => {
                        if (conn.status === "connected") {
                            instance.data.connectionObj = conn.connection;
                            instance.data.tezosWalletProvider = instance.data.connectionObj.provider;
                            instance.publishState('is_tezos_wallet_conencted', true);
                            instance.triggerEvent('tezos_wallet_connected');
                            cb();
                        } else if (conn.status === "disconnected") {
                            instance.publishState('is_tezos_wallet_conencted', false);
                            instance.triggerEvent('tezos_wallet_disconnected');
                        }
                    });
                } catch (e) {
                    console.log('Error: ', e);
                }
            }
        } else if (instance.data.blockchainName == 'FLOW') {
            // TO DO
            if (!instance.data.flow_connector) {
                try {
                    // const tezosConnectorEnv = envFullName.substr(8).toLowerCase();
                    const connector = window.buildFlowConnector("https://access-testnet.onflow.org", "https://fcl-discovery.onflow.org/testnet/authn", instance.data.conf.app_name, "https://rarible.com/favicon.png?2d8af2455958e7f0c812");
                    instance.data.flow_connector = connector;
                    setTimeout(() => {
                        connector.connection.subscribe((conn) => {
                            if (conn.status === "connected") {
                                instance.data.connectionObj = conn.connection;
                                instance.data.flowWalletProvider = instance.data.connectionObj.provider;
                                instance.publishState('is_tezos_wallet_conencted', true);
                                instance.triggerEvent('tezos_wallet_connected');
                                cb();
                            } else if (conn.status === "disconnected") {
                                instance.publishState('is_tezos_wallet_conencted', false);
                            }
                        });
                    }, 2000);

                } catch (e) {
                    console.log('Error: ', e);
                }
            }
        }
    }
    const blockchainWallets = {
        'metamask': (cb) => {
            const isMMinstalled = typeof window.ethereum == 'object';
            if (isMMinstalled) {
                let provider;
                if (window.ethereum.providers) {
                    provider = window.ethereum.providers.find((provider) => provider.isMetaMask);
                } else {
                    provider = window.ethereum;
                }
                instance.data.web3 = new Web3(provider);//save once
                getAddress(provider, (addr) => {
                    if (typeof addr == "string") {
                        instance.data.selectedAddress = addr;
                        const getChainID = (provider) => {
                            provider.request({ method: 'eth_chainId' }).then((hexId) => {
                                instance.data.chainId = instance.data.web3.utils.hexToNumber(hexId);
                                buildConnObj(instance.data.web3);
                                cb(true);
                            }).catch(instance.data.errEvent)
                        };
                        getChainID(provider);
                    } else {
                        cb(false);
                    }
                })
            } else { cb(false); }
        },
        'walletconnect': (cb) => {
            if (window.walletConnectInitiatedProvider) {
                const { accounts, chainId } = window.walletConnectInitiatedProvider;
                instance.data.selectedAddress = accounts[0];
                instance.data.chainId = chainId;
                buildConnObj(new Web3(window.walletConnectInitiatedProvider));
                cb(true);
            } else {
                cb(false);
            }
        },
        'tezos': (cb) => {
            setTimeout(() => {
                buildConnObj(window.tezosProvider, () => {
                    instance.data.connectionObj.provider.address().then((address) => {
                        instance.data.selectedAddress = address;
                        instance.publishState('tezos_-_wallet_address', address);
                        cb(true);
                    })
                });
            }, 500)
        },
        'flow': (cb) => {
            buildConnObj(null, (address) => {
                // instance.data.selectedAddress = address;
                // cb(true);
            });
        },
        'web3auth': (cb) => {
            const { address, chainId } = instance.data.web3Auth.data;
            instance.data.selectedAddress = address;
            instance.data.chainId = chainId;
            buildConnObj(new Web3(instance.data.web3Auth.provider));
            cb(true);
        }
    }

    const init = () => {
        // Init main functions only after the plugin element is fully loaded and the sdk is ready to be used
        // to avoid undefined errors in some cases

        instance.data.initiateSDK = () => {
            try {
                const useENV = instance.data.envSDKtypes[instance.data.env] != "prod" ? "testnet" : instance.data.envSDKtypes[instance.data.env];
                instance.data.sdk = window.createRaribleSdk(instance.data.connectionObj, useENV);
                window.logSDKConnected(envFullName);
            } catch (e) {
                console.warn('SDK failed to initialize. ', e);
            }
            activeEnv = instance.data.env;
        }

        instance.data.checkSDKandWeb3 = (cb) => {
            instance.publishState('order_stage', '');//reset state
            blockchainWallets[instance.data.walletType]((isEnabled) => {
                if (isEnabled && (typeof instance.data.sdk === 'undefined' || activeEnv != instance.data.env)) {
                    instance.data.initiateSDK();
                }
                return cb(isEnabled);
            });
        }

        instance.data.error = (e, actionType) => {
            // action types: sell, bid, minting, accept bid, buy item
            let actionName = actionType && actionType.toLowerCase();
            if (e.code === 4001 || (e.message && e.message.includes('Unexpected identifier "object"'))) {
                instance.publishState('order_stage', 'Canceled');
                actionName && instance.triggerEvent(`${actionName.toLowerCase()}_canceled_by_user`);
            } else {
                console.log(e);
                instance.publishState('order_stage', 'Error');
                actionName && instance.triggerEvent(`error_while_placing_${actionName}`);
            }
            // Plugin by novabloq.com
        }
    }
    let setConfInProgress = false; //prevent multiple calls with same settings

    window.initRarible = (provider, data) => {
        instance.data.web3Auth = { provider, data };
        if (chainIds[`${data.chainId}`] != instance.data.env) {
            instance.data.env = chainIds[`${data.chainId}`];
            envFullName = instance.data.env;
            instance.data.blockchainName = envAPItypes[envFullName];
        }
        init();
        instance.data.checkSDKandWeb3((res) => { setConfInProgress = false; })
    }

    instance.data.setConfig = conf => {
        if (conf && !setConfInProgress) {
            instance.data.conf = conf;
            setConfInProgress = true;
            instance.data.walletType = conf.wallet_type.toLowerCase();

            if (instance.data.walletType != "web3auth") init();


            envFullName = conf.env;
            instance.data.env = envFullName;
            instance.data.blockchainName = envAPItypes[envFullName];

            if (instance.data.walletType != "web3auth") instance.data.checkSDKandWeb3((res) => { setConfInProgress = false; });
            else setConfInProgress = false;
        }
    }
}