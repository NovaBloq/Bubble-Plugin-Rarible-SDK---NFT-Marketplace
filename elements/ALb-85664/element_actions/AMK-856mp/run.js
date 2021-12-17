function(instance, properties, context) {
    const { contractAddress, tokenId } = properties;
    instance.data.checkSDKandWeb3((enabled) => {
        if (enabled) {
            instance.data.sdk.nft.burn({
                "contract": contractAddress,
                tokenId
            }).then(() => {
                instance.triggerEvent('token_burned');
            }).catch((e) => { console.log('err', e) })
        }
    })

}