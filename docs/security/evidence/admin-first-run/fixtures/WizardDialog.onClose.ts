    async onClose(): Promise<void> {
        // read if discovery is available
        let discovery: ioBroker.State | null | undefined;
        try {
            discovery = await this.props.socket.getState('system.adapter.discovery.0.alive');
        } catch {
            // ignore: the wizard must be closable even if the state cannot be read
        }
        const target = `#tab-adapters${discovery?.val ? '/discovery' : ''}`;

        if (!this.adminInstance) {
            Router.doNavigate('tab-adapters', discovery?.val ? 'discovery' : undefined);
            this.props.onClose();
            return;
        }

        if (
            this.adminInstance.native.secure === this.state.secure &&
            this.adminInstance.native.auth === this.state.auth
        ) {
            // Nothing to change, so no restart of admin is required
            Router.doNavigate('tab-adapters', discovery?.val ? 'discovery' : undefined);
            this.props.onClose();
            return;
        }

        let certPublic: string | undefined;
        let certPrivate: string | undefined;

        if (this.state.secure && (!this.adminInstance.native.certPublic || !this.adminInstance.native.certPrivate)) {
            // get certificates
            try {
                const certs = await this.props.socket.getCertificates();
                certPublic = certs?.find(c => c.type === 'public')?.name;
                certPrivate = certs?.find(c => c.type === 'private')?.name;
            } catch (e) {
                this.setState({ errorText: I18n.t('Cannot read certificates: %s', (e as Error).message || e) });
                return;
            }
        }

        if (this.state.secure && (!certPublic || !certPrivate)) {
            // Let the user press "Finish" again: SSL is disabled now, so the setup can be completed without it
            this.setState({
                secure: false,
                errorText: I18n.t('Cannot enable authentication as no certificates found!'),
            });
            return;
        }

        this.adminInstance.native.auth = this.state.auth;
        this.adminInstance.native.secure = this.state.secure;
        if (this.state.secure) {
            this.adminInstance.native.certPublic = this.adminInstance.native.certPublic || certPublic;
            this.adminInstance.native.certPrivate = this.adminInstance.native.certPrivate || certPrivate;
        }

        try {
            await this.props.socket.setObject(this.adminInstance._id, this.adminInstance);
        } catch (e) {
            this.setState({ errorText: (e as Error).message || (e as string).toString() });
            return;
        }

        // redirect to https or http, as admin will be restarted
        this.props.onClose(
            `${this.adminInstance.native.secure ? 'https' : 'http'}://${window.location.host}${adminHref(target)}`,
        );
    }

