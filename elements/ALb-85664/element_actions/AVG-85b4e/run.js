function(instance, properties, context) {
    const { assetType, name, symbol, isUserToken } = properties;

    const contractUriAPI = instance.data.envSDKtypes[instance.data.env] == "prod" ? "" : instance.data.envSDKtypes[instance.data.env] + ".";// Mainnet doesn't have prod prefix
    const contractURI = `https://api-${contractUriAPI}rarible.com/contractMetadata/{address}`;
    const createRequestObj = () => {
        let request = {
            blockchain: instance.data.blockchainName,
            asset: {
                assetType,
                arguments: {
                    name,
                    symbol,
                    contractURI,
                    isUserToken
                }
            }
        }
        if (instance.data.blockchainName != "TEZOS") {
            request.asset.arguments.baseURI = "ipfs:/";
        }
        if (isUserToken) {
            request.asset.arguments.operators = [`${instance.data.blockchainName}:${instance.data.selectedAddress}`]
        }
        return request;
    }
    const createCollection = () => {
        const collectionRequest = createRequestObj();
        instance.data.sdk.nft.createCollection(collectionRequest)
            .then((res) => {
                const address = res.address.split(':')[1];
                const hash = res.tx.transaction.hash;
                instance.publishState('created_collection_address', address);
                instance.publishState('created_collection_tx', hash);
                instance.triggerEvent('collection_created');
            }).catch((e) => {
                instance.triggerEvent('error_while_creating_collection');
                console.log('Error while creating a new collection');
                console.log('Full log: ', e);
            })
    }
    instance.data.checkSDKandWeb3(enabled => {
        if (!enabled) return;
        createCollection();
    });

}