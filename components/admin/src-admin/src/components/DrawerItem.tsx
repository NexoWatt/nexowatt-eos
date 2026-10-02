import React, { type JSX } from 'react';

import { Badge, Grid2, ListItemButton, ListItemIcon, ListItemText, Tooltip, Checkbox } from '@mui/material';
import { DragHandle } from '@mui/icons-material';

import { Utils, ColorPicker, type IobTheme } from '@iobroker/adapter-react-v5';
import AdminUtils from '../helpers/AdminUtils';

const styles: Record<string, any> = {
    selected: (theme: IobTheme) => ({
        background: theme.palette.primary.main,
        color: theme.palette.mode === 'light' ? 'white' : AdminUtils.invertColor(theme.palette.primary.main, true),
        '&:hover': {
            background: theme.palette.primary.main,
            color: theme.palette.mode === 'light' ? 'white' : AdminUtils.invertColor(theme.palette.primary.main, true),
            '& $selectedIcon': {
                color:
                    theme.palette.mode === 'light' ? 'white' : AdminUtils.invertColor(theme.palette.primary.main, true),
            },
        },
    }),
    selectedIcon: (theme: IobTheme) => ({
        color: theme.palette.mode === 'light' ? 'white' : AdminUtils.invertColor(theme.palette.primary.main, true),
    }),
    compactBadge: {
        pl: '12px',
    },
    noWrap: {
        flexWrap: 'nowrap',
        height: 40,
    },
    warn: {
        backgroundColor: '#ffc107',
    },
    nativeItem: {
        border: '1px solid rgba(96, 189, 255, 0.16)',
        background: 'linear-gradient(180deg, rgba(13, 34, 53, 0.86), rgba(6, 19, 32, 0.92))',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        transition: 'transform .18s ease, border-color .18s ease, box-shadow .18s ease, background .18s ease',
        '&:hover': {
            transform: 'translateY(-1px)',
            borderColor: 'rgba(0, 255, 136, 0.28)',
            background: 'linear-gradient(180deg, rgba(17, 44, 66, 0.94), rgba(7, 22, 36, 0.96))',
            boxShadow: '0 10px 24px rgba(0,0,0,.22), inset 0 0 0 1px rgba(0,255,136,.06)',
        },
    },
    nativeSelected: {
        borderColor: 'rgba(0, 255, 136, 0.48)',
        background: 'linear-gradient(135deg, rgba(0,255,136,.17), rgba(0,212,255,.10))',
        boxShadow: '0 0 22px rgba(0,255,136,.09), inset 0 0 0 1px rgba(0,255,136,.11)',
    },
};

interface DrawerItemProps {
    tabName?: string;
    badgeColor?: 'error' | 'warn' | 'primary' | '';
    badgeContent?: number;
    compact?: boolean;
    icon: JSX.Element;
    onClick?: (e?: React.MouseEvent) => void;
    selected?: boolean;
    text: string;
    editMenuList?: boolean;
    visible?: boolean;
    color?: string;
    editListFunc?: (visible: boolean, color?: string | null) => void;
    badgeAdditionalContent?: number;
    badgeAdditionalColor?: 'error' | '' | 'warn' | 'secondary';
    style?: Record<string, any>;
    theme: IobTheme;
}

const DrawerItem = (props: DrawerItemProps): JSX.Element => {
    const {
        tabName,
        badgeColor,
        badgeContent,
        compact,
        icon,
        onClick,
        selected,
        text,
        editMenuList,
        visible,
        color,
        editListFunc,
        badgeAdditionalContent,
        badgeAdditionalColor,
        style,
    } = props;

    let content = text ? text.replace('&gt;', '>') : '';

    if (content === 'Text->Kommandos') {
        content = 'Text→Cmd';
    } else if (content === 'Text->Commands') {
        content = 'Text→Cmd';
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', ...(style || {}) }}>
            {!!editMenuList && <DragHandle />}
            {!!editMenuList && (
                <Checkbox
                    checked={visible}
                    onClick={() => editListFunc(true)}
                />
            )}
            {!!editMenuList && (
                <ColorPicker
                    value={color}
                    noInputField
                    onChange={value => editListFunc(false, value || null)}
                />
            )}
            <ListItemButton
                className="nexowatt-native-nav-item"
                data-eos-tab={tabName}
                aria-current={selected ? 'page' : undefined}
                sx={Utils.getStyle(
                    props.theme,
                    styles.nativeItem,
                    selected && styles.nativeSelected,
                    selected && styles.selected,
                    compact && styles.compactBadge,
                )}
                onClick={onClick}
            >
                <Tooltip
                    title={compact ? content : ''}
                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                >
                    <Grid2
                        container
                        spacing={1}
                        alignItems="center"
                        style={styles.noWrap}
                    >
                        <Grid2>
                            <ListItemIcon
                                className="nexowatt-native-nav-icon-slot"
                                style={{ minWidth: 0, color }}
                                sx={selected ? styles.selectedIcon : undefined}
                            >
                                <Badge
                                    badgeContent={badgeContent || 0}
                                    color={(badgeColor === 'warn' ? 'default' : badgeColor) || 'primary'}
                                    sx={badgeColor === 'warn' ? { '& .MuiBadge-badge': styles.warn } : undefined}
                                >
                                    {icon}
                                </Badge>
                            </ListItemIcon>
                        </Grid2>
                        {!compact && (
                            <Grid2>
                                <ListItemText style={{ color }}>
                                    <Badge
                                        badgeContent={badgeAdditionalContent || 0}
                                        color={
                                            (badgeAdditionalColor === 'warn' ? 'default' : badgeAdditionalColor) ||
                                            'primary'
                                        }
                                        sx={
                                            badgeAdditionalColor === 'warn'
                                                ? { '& .MuiBadge-badge': styles.warn }
                                                : undefined
                                        }
                                    >
                                        {content}
                                    </Badge>
                                </ListItemText>
                            </Grid2>
                        )}
                    </Grid2>
                </Tooltip>
            </ListItemButton>
        </div>
    );
};

export default DrawerItem;
