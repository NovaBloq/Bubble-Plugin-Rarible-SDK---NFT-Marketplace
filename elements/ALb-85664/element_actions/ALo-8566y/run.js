function(instance, properties, context) {

    const { hash } = properties;

    instance.data.checkSDKandWeb3((enabled) => {
        if (!enabled) return;
        const cancelOrderRequest = {
            orderId: instance.data.blockchainName + ":" + hash,
        };

        instance.data.sdk.order.cancel(cancelOrderRequest).then((res) => {
            instance.triggerEvent('order_canceled');
        }).catch((e) => {
            instance.data.error(e, 'order_canceled')
        });
    })
}