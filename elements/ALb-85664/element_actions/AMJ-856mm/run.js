function(instance, properties, context) {
    const { contract, tokenId, amount, receiverAddress } = properties;
    instance.data.checkSDKandWeb3((enabled) => {
        if (enabled) {
            instance.data.sdk.nft.transfer({ contract, tokenId }, receiverAddress, amount).then(() => {
                instance.triggerEvent('token_transfered');
            }).catch(instance.data.error)
        }
    })
}