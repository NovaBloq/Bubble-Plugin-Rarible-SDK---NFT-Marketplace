function(instance, properties, context) {
    const { hash, amount, type } = properties;
    instance.data.checkSDKandWeb3((enabled) => {
        if (enabled) {
            const fillType = type == "Buy" ? "buy_item" : "accept_bid";
            instance.publishState('order_stage', 'Preparing request');
            const fill = order => {
                // instance.data.sdk.order.fill({ order, amount }).then(actionBuilder => { instance.data.runActions(actionBuilder, fillType) })
                instance.data.sdk.order.fill({ order, amount }).then(e => {
                    instance.publishState('order_stage', 'Done');
                    instance.publishState('order_hash', e.hash);
                    instance.triggerEvent(`${fillType.toLowerCase()}_order_placed`);
                }).catch((e) => instance.data.error(e, fillType))
            }
            instance.data.sdk.apis.order.getOrderByHash({ hash }).then(fill)
        }
    })
}