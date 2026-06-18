export const REGEX_DOB = /^(?<dob>.*)\s\((?<age>\d*)\)/;
export const REGEX_MEMBERS_DATE = /\(Score: (?<date>.+)\)/;
export const REGEX_BG_COLOR = /background-color:(?<color>[^;]+);/;
export const REGEX_CHART_CLUB_ID = /(?<club_id>\d+)/;
export const REGEX_COUNTRY_ID = /(?<id>\d+)/;
export const REGEX_DOB_AGE = /^(?<dob>\w{3} \d{1,2}, \d{4}) \((?<age>\d{2})\)/;

export function trim(text: string | string[] | null | undefined): string {
    if (!text) return "";
    if (Array.isArray(text)) {
        text = text.join("");
    }
    return text.trim().replace(/\u00a0/g, ""); // replaces \xa0
}

export function extractFromUrl(tfmktUrl: string | null | undefined, element: string = "id"): string | null {
    if (!tfmktUrl) return null;
    const cleanUrl = trim(tfmktUrl);
    const regex = /\/(?<code>[\w%-]+)\/(?<category>[\w-]+)\/(?<type>[\w-]+)\/(?<id>\w+)(\/saison_id\/(?<season_id>\d{4}))?(\/transfer_id\/(?<transfer_id>\d+))?/;
    const match = cleanUrl.match(regex);
    if (!match || !match.groups) return null;
    return match.groups[element] || null;
}

export function safeRegex(text: string | string[] | null | undefined, regex: RegExp, group: string): string | null {
    if (!text) return null;
    const cleanText = trim(text);
    const match = cleanText.match(regex);
    if (!match || !match.groups) return null;
    return match.groups[group] || null;
}

export function removeStr(text: string | null | undefined, stringsToRemove: string | string[]): string | null {
    if (typeof text !== "string") return null;
    const listToRemove = Array.isArray(stringsToRemove) ? stringsToRemove : [stringsToRemove];
    let cleanText = text;
    for (const str of listToRemove) {
        // Escape special regex chars
        const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        cleanText = cleanText.replace(new RegExp(escaped, "g"), "");
    }
    return trim(cleanText);
}

export function safeSplit(text: string | null | undefined, delimiter: string): string[] | null {
    if (typeof text !== "string") return null;
    return text.split(delimiter).map(t => trim(t)).filter(Boolean);
}

export function toCamelCase(headers: string[]): string[] {
    return headers.map(header => {
        const words = header.split(/[\s_]+/);
        const camel = words.map((w, idx) => {
            if (idx === 0) return w.toLowerCase();
            return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        }).join("");
        return camel;
    });
}

export function zipListsIntoDict(listKeys: string[], listValues: any[]): Record<string, any> {
    const dict: Record<string, any> = {};
    listKeys.forEach((key, idx) => {
        dict[key] = listValues[idx] !== undefined ? listValues[idx] : null;
    });
    return dict;
}

export function parseDate(v: string | null | undefined): string | null {
    if (!v) return null;
    const clean = trim(v);
    if (!clean) return null;

    // Check if it matches DD/MM/YYYY
    const slashMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
        const day = parseInt(slashMatch[1], 10);
        const month = parseInt(slashMatch[2], 10) - 1; // 0-indexed in JS Date
        const year = parseInt(slashMatch[3], 10);
        const d = new Date(year, month, day);
        if (isNaN(d.getTime())) return null;
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    const parsed = Date.parse(clean);
    if (isNaN(parsed)) return null;
    return new Date(parsed).toISOString().split("T")[0];
}

export function parseMarketValue(v: string | null | undefined): number | null {
    if (!v) return null;
    const vStr = String(v).trim();
    if (!/\d/.test(vStr)) return null;

    let valueStr = vStr.toLowerCase();
    if (valueStr.includes("<")) {
        const matches = valueStr.match(/€([\d,.]+[kmb]?)/);
        if (!matches) return null;
        valueStr = matches[1];
    } else {
        valueStr = valueStr.replace(/€|\+|\'/g, "").trim();
    }

    if (valueStr.includes("k")) {
        return Math.round(parseFloat(valueStr.replace("k", "")) * 1000);
    } else if (valueStr.includes("m")) {
        return Math.round(parseFloat(valueStr.replace("m", "")) * 1000000);
    } else if (valueStr.includes("bn") || valueStr.includes("b")) {
        return Math.round(parseFloat(valueStr.replace(/bn|b/, "")) * 1000000000);
    } else {
        const num = parseFloat(valueStr);
        return isNaN(num) ? null : Math.round(num);
    }
}

export function parseHeight(v: string | null | undefined): number | null {
    if (!v) return null;
    const clean = v.replace(/,|\.|m|،|\s/g, "");
    const num = parseInt(clean, 10);
    return isNaN(num) ? null : num;
}

export function parseDays(v: string | null | undefined): number | null {
    if (!v) return null;
    const clean = v.replace(/\D/g, "");
    const num = parseInt(clean, 10);
    return isNaN(num) ? null : num;
}
