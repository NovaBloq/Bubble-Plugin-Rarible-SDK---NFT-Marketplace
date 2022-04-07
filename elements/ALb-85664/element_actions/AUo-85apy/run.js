function(instance, properties, context) {
    if (instance.data.tezos_connector) {
        instance.data.tezos_connector.getOptions().then(options => {
            instance.data.tezos_connector.connect(options[0]);
        })
    }
}