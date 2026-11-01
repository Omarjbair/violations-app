export function toAuditSnapshot(value: unknown): Record<string, unknown> {
    if (
        value &&
        typeof value === 'object' &&
        'toObject' in value &&
        typeof (value as { toObject?: unknown }).toObject === 'function'
    ) {
        return (
            value as { toObject: () => Record<string, unknown> }
        ).toObject();
    }

    return value as Record<string, unknown>;
}
