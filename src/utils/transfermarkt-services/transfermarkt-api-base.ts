import { JSDOM } from "jsdom";
import { trim } from "./transfermarkt-api-utils";
import { PaginationXPaths } from "./transfermarkt-api-xpath";

class TransfermarktRequestError extends Error {
    constructor(message: string, readonly retryable: boolean) {
        super(message);
    }
}

export interface XPathOptions {
    pos?: number;
    iloc?: number;
    ilocFrom?: number;
    ilocTo?: number;
    joinStr?: string;
}

export class TransfermarktApiBase {
    private static readonly requestHeaders = {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
    };
    private static readonly transientStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);
    private static readonly maximumAttempts = 3;
    private static readonly maximumRedirects = 5;
    protected URL: string;
    protected document!: Document;
    protected response: Record<string, any> = {};

    constructor(url: string) {
        this.URL = url;
    }

    async makeRequest(url?: string): Promise<string> {
        const targetUrl = url || this.URL;
        try {
            const { response } = await this.requestFollowingRedirects(targetUrl);
            return await response.text();
        } catch (e: any) {
            throw new Error(`Request failed for URL ${targetUrl}: ${e.message}`);
        }
    }

    async makeRequestJson(url: string): Promise<any> {
        try {
            const { response } = await this.requestFollowingRedirects(url);
            return await response.json();
        } catch (e: any) {
            throw new Error(`JSON request failed for URL ${url}: ${e.message}`);
        }
    }

    private async requestFollowingRedirects(
        targetUrl: string
    ): Promise<{ response: Response; resolvedUrl: string }> {
        let lastError: Error | undefined;
        for (let attempt = 0; attempt < TransfermarktApiBase.maximumAttempts; attempt += 1) {
            let currentUrl = targetUrl;
            let retryScheduled = false;
            try {
                for (let redirect = 0; redirect <= TransfermarktApiBase.maximumRedirects; redirect += 1) {
                    const response = await fetch(currentUrl, {
                        headers: TransfermarktApiBase.requestHeaders,
                        redirect: "manual"
                    });
                    const location = response.headers.get("location");
                    if (response.status >= 300 && response.status < 400 && location) {
                        await response.body?.cancel();
                        currentUrl = new URL(location, currentUrl).toString();
                        continue;
                    }
                    if (response.ok) {
                        return { response, resolvedUrl: currentUrl };
                    }

                    const retryable = TransfermarktApiBase.transientStatuses.has(response.status);
                    const error = new TransfermarktRequestError(
                        `HTTP Error: ${response.status} ${response.statusText} for URL: ${currentUrl}`,
                        retryable
                    );
                    await response.body?.cancel();
                    if (!retryable || attempt === TransfermarktApiBase.maximumAttempts - 1) {
                        throw error;
                    }
                    lastError = error;
                    retryScheduled = true;
                    break;
                }
                if (!retryScheduled) {
                    throw new TransfermarktRequestError(
                        `Too many redirects while requesting URL: ${targetUrl}`,
                        false
                    );
                }
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (
                    (lastError instanceof TransfermarktRequestError && !lastError.retryable)
                    || attempt === TransfermarktApiBase.maximumAttempts - 1
                ) {
                    throw lastError;
                }
            }
            await this.wait(300 * (attempt + 1));
        }
        throw lastError ?? new Error(`Request failed for URL: ${targetUrl}`);
    }

    private wait(milliseconds: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, milliseconds));
    }

    async initializePage(): Promise<void> {
        const html = await this.makeRequest();
        const dom = new JSDOM(html);
        this.document = dom.window.document;
    }

    raiseExceptionIfNotFound(xpath: string): void {
        const result = this.get_text_by_xpath(xpath);
        if (!result) {
            throw new Error(`Invalid request (URL: ${this.URL}). Selector ${xpath} not found.`);
        }
    }

    evaluateXPath(xpath: string, contextNode: Node = this.document): any[] {
        const result = this.document.evaluate(
            xpath,
            contextNode,
            null,
            7, // XPathResult.ORDERED_NODE_SNAPSHOT_TYPE
            null
        );
        const nodes: any[] = [];
        for (let i = 0; i < result.snapshotLength; i++) {
            const node = result.snapshotItem(i);
            if (node) {
                if (node.nodeType === 2 || node.nodeType === 3) { // ATTRIBUTE_NODE or TEXT_NODE
                    nodes.push(node.nodeValue);
                } else {
                    nodes.push(node);
                }
            }
        }
        return nodes;
    }

    get_list_by_xpath(xpath: string, removeEmpty: boolean = true, contextNode: Node = this.document): any[] {
        const elements = this.evaluateXPath(xpath, contextNode);
        const mapped = elements.map(e => {
            if (typeof e === "string") {
                return trim(e);
            }
            return e;
        });

        if (removeEmpty) {
            return mapped.filter(e => {
                if (typeof e === "string") {
                    return e.length > 0;
                }
                return e !== null && e !== undefined;
            });
        }
        return mapped;
    }

    get_text_by_xpath(
        xpath: string,
        options: XPathOptions = {},
        contextNode: Node = this.document
    ): string | null {
        const { pos = 0, iloc, ilocFrom, ilocTo, joinStr } = options;
        const elements = this.evaluateXPath(xpath, contextNode);
        
        if (elements.length === 0) {
            return null;
        }

        let textList = elements.map(e => {
            if (typeof e === "string") return trim(e);
            return trim(e.textContent || "");
        }).filter(t => t.length > 0);

        if (textList.length === 0) {
            return null;
        }

        if (typeof iloc === "number") {
            const val = textList[iloc];
            return val !== undefined ? val : null;
        }

        let slicedList = textList;
        if (typeof ilocFrom === "number" && typeof ilocTo === "number") {
            slicedList = textList.slice(ilocFrom, ilocTo);
        } else if (typeof ilocTo === "number") {
            slicedList = textList.slice(0, ilocTo);
        } else if (typeof ilocFrom === "number") {
            slicedList = textList.slice(ilocFrom);
        }

        if (typeof joinStr === "string") {
            return slicedList.join(joinStr);
        }

        const val = slicedList[pos];
        return val !== undefined ? val : null;
    }

    get_last_page_number(xpath_base: string = ""): number {
        for (const xpath of [PaginationXPaths.PAGE_NUMBER_LAST, PaginationXPaths.PAGE_NUMBER_ACTIVE]) {
            const url_page = this.get_text_by_xpath(xpath_base + xpath);
            if (url_page) {
                const parts = url_page.split("/");
                const lastPart = parts[parts.length - 1];
                const pageMatch = lastPart.match(/page=(\d+)/) || lastPart.match(/(\d+)/);
                if (pageMatch) {
                    return parseInt(pageMatch[1], 10);
                }
            }
        }
        return 1;
    }
}
