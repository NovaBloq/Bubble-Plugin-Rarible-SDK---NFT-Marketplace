function(instance, properties, context) {
    const { hash, amount, type } = properties;
    const prepareFillOrder = enabled => {
        if (!enabled) return;
        const fillType = type == "Buy" ? "buy_item" : "accept_bid";
        instance.publishState('order_stage', 'Preparing request');
        const fillRequest = {
            orderId: instance.data.blockchainName + ":" + hash
        };
        instance.data.sdk.order.fill(fillRequest).then(fillResponse => {
            fillResponse.submit({ amount }).then((e) => {
                instance.publishState('order_stage', 'Done');
                instance.publishState('order_hash', e.transaction.hash);
                instance.triggerEvent(`${fillType.toLowerCase()}_order_placed`);
            }).catch((e) => { instance.data.error(e, fillType) })
        }).catch((e) => { instance.data.error(e, fillType) });
    }

    if (instance.data.blockchainName == "ETHEREUM") {
        instance.data.checkSDKandWeb3((enabled) => {
            prepareFillOrder(enabled);
        });
    } else {
        prepareFillOrder(true);
    }

}