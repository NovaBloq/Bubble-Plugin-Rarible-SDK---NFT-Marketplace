function(instance, properties, context) {
    if (instance.data.tezosWalletProvider) {
        instance.data.tezosWalletProvider.tk.wallet.context.walletProvider.client.disconnect()
            .then(() => {
                console.log('disconnected');
            	instance.publishState('is_tezos_wallet_conencted', false);
            })
    }
}