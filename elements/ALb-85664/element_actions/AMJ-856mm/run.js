function(instance, properties, context) {
    const { contract, tokenId, amount, receiverAddress } = properties;
    const itemId = instance.data.getUnionItemId(contract, tokenId);
    const recipient = `${instance.data.blockchainName}:${receiverAddress}`;

    const prepareTransfer = enabled => {
        if (enabled) {
            instance.data.sdk.nft.transfer({ itemId }).then((transfer) => {
                transfer.submit({ to: recipient, amount }).then((a) => {
                    instance.publishState('nft_transfer_tx_id', a.transaction.hash)
                    instance.triggerEvent('token_transfered');
                }).catch((e)=>{ instance.data.error(e,"transferring") });
            }).catch((e)=>{ instance.data.error(e,"transferring") });
        }
    }

    if (instance.data.blockchainName == "ETHEREUM") {
        instance.data.checkSDKandWeb3((enabled) => {
            prepareTransfer(enabled);
        });
    } else {
        prepareTransfer(true);
    }
    
}