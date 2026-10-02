import type { JSX } from 'react';
import BaseField from './BaseField';
import type { ConfigItemCustom } from '@iobroker/json-config';
import type { BackitupNative } from './Components/types';

class CheckConfigInvisible extends BaseField {
    async componentDidMount(): Promise<void> {
        await super.componentDidMount();
        if (!this.isConfigFilled((this.props.schema as ConfigItemCustom).custom?.adapter)) {
            const data = { ...this.props.data };
            const result = await this.fetchConfig(
                (this.props.schema as ConfigItemCustom).custom?.adapter,
                data as BackitupNative,
            );
            if (result.changed) {
                this.props.onChange(data);
            }
        }
    }

    renderItem(): JSX.Element | null {
        return this.renderMessage();
    }
}

export default CheckConfigInvisible;
