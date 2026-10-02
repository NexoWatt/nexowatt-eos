import React, { type JSX } from 'react';

export type NexoWattNavIconName =
    | 'cockpit'
    | 'modules'
    | 'services'
    | 'datapoints'
    | 'structure'
    | 'logs'
    | 'rights'
    | 'scripts'
    | 'hosts'
    | 'files'
    | 'devices'
    | 'backup'
    | 'eos'
    | 'default';

const paths: Record<NexoWattNavIconName, JSX.Element> = {
    cockpit: (
        <>
            <rect x="3.5" y="3.5" width="7" height="7" rx="1.7" />
            <rect x="13.5" y="3.5" width="7" height="7" rx="1.7" />
            <rect x="3.5" y="13.5" width="7" height="7" rx="1.7" />
            <rect x="13.5" y="13.5" width="7" height="7" rx="1.7" />
        </>
    ),
    modules: (
        <>
            <path d="M12 3.7 18.7 7.5v8.9L12 20.3 5.3 16.4V7.5L12 3.7Z" />
            <path d="M12 3.7V12m6.7-4.5L12 12 5.3 7.5" />
        </>
    ),
    services: (
        <>
            <rect x="4" y="4.5" width="16" height="5" rx="2" />
            <rect x="4" y="14.5" width="16" height="5" rx="2" />
            <path d="M8 7h.01M8 17h.01M12 7h5M12 17h5" />
        </>
    ),
    datapoints: (
        <>
            <circle cx="6" cy="12" r="2.3" />
            <circle cx="18" cy="6" r="2.3" />
            <circle cx="18" cy="18" r="2.3" />
            <path d="M8.2 11 15.7 7M8.2 13l7.5 4" />
        </>
    ),
    structure: (
        <>
            <rect x="3.5" y="4" width="7" height="4.5" rx="1.4" />
            <rect x="13.5" y="4" width="7" height="4.5" rx="1.4" />
            <rect x="8.5" y="15.5" width="7" height="4.5" rx="1.4" />
            <path d="M7 8.5v3h10v-3M12 11.5v4" />
        </>
    ),
    logs: (
        <>
            <path d="M5 6.5h14M5 12h8M5 17.5h14" />
            <path d="m15.2 10.3 2.1 2.2 3.2-4" />
        </>
    ),
    rights: (
        <>
            <path d="M12 3.5 18.5 6v5.1c0 4.2-2.7 7.3-6.5 9.4-3.8-2.1-6.5-5.2-6.5-9.4V6L12 3.5Z" />
            <path d="M9.5 11.8 11 13.3l3.7-3.7" />
        </>
    ),
    scripts: <path d="M8.8 7 4.5 12l4.3 5M15.2 7l4.3 5-4.3 5M13.2 5 10.8 19" />,
    hosts: (
        <>
            <rect x="4" y="4.5" width="16" height="10" rx="2.2" />
            <path d="M8 19.5h8M12 14.5v5M7.5 8.5h.01M11 8.5h6" />
        </>
    ),
    files: <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H10l2 2h5.5A2.5 2.5 0 0 1 20 9.5v7a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />,
    devices: (
        <>
            <rect x="4" y="5" width="16" height="14" rx="2.4" />
            <path d="M8 9h8M8 13h3M15.5 13h.01" />
        </>
    ),
    backup: (
        <>
            <path d="M6 6h10a3 3 0 0 1 3 3v7.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 16.5V8a2 2 0 0 1 2-2Z" />
            <path d="M9 6V4.5h4V6M9 12.5h6M12 9.5v6" />
        </>
    ),
    eos: (
        <>
            <circle cx="12" cy="12" r="3.6" />
            <path d="M12 3.5v4.2M12 16.3v4.2M3.5 12h4.2M16.3 12h4.2M5.9 5.9l3 3M15.1 15.1l3 3M5.9 18.1l3-3M15.1 8.9l3-3" />
        </>
    ),
    default: (
        <>
            <circle cx="12" cy="12" r="8" />
            <path d="M12 8v4l2.7 2.7" />
        </>
    ),
};

export default function NexoWattNavIcon({ name }: { name: NexoWattNavIconName }): JSX.Element {
    return (
        <span className="nexowatt-native-nav-icon eos-native-nav-icon eos-native-nav-icon-source" aria-hidden="true">
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                {paths[name] || paths.default}
            </svg>
        </span>
    );
}
