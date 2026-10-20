/**
 * Utility functions for masking sensitive identifiers in the UI.
 */

/**
 * Masks a standard ID or UUID, showing only the last few characters.
 * @param id The ID to mask
 * @param visibleLength Number of characters to keep visible at the end
 */
export const maskId = (id: string, visibleLength = 4) => {
    if (!id) return '';
    if (id.length <= visibleLength) return id;
    return `••••••••••••••••••••${id.slice(-visibleLength)}`;
};

/**
 * Specifically masks UUIDs within an Azure resource path or any string.
 * This is useful for subscription IDs and tenant IDs embedded in resource paths.
 * @param path The string potentially containing UUIDs
 */
export const maskAzurePath = (path: string) => {
    if (!path) return '';
    // Regex to match UUIDs and replace them with a masked version
    return path.replace(
        /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g,
        '••••••••-••••-••••-••••-••••••••••••'
    );
};
