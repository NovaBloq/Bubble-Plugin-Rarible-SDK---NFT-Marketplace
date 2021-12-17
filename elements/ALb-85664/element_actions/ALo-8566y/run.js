function(instance, properties, context) {

    const { hash, order_maker } = properties;
    const cancelOrder = ({ to, data }) => {
        const params = { from: order_maker, to, data }
        instance.data.web3.eth.sendTransaction(params)
            .on('receipt', () => { instance.triggerEvent('order_canceled'); })
            .on('error', (e) => instance.data.error(e, 'order_canceled'));
    }

    instance.data.checkSDKandWeb3((enabled) => {
        if (enabled) instance.data.sdk.apis.order.prepareOrderCancelTransaction({ hash }).then(cancelOrder);
    })
}