import { JSDOM } from "jsdom";
import { trim } from "./transfermarkt-api-utils";
import { PaginationXPaths } from "./transfermarkt-api-xpath";

export interface XPathOptions {
    pos?: number;
    iloc?: number;
    ilocFrom?: number;
    ilocTo?: number;
    joinStr?: string;
}

export class TransfermarktApiBase {
    protected URL: string;
    protected document!: Document;
    protected response: Record<string, any> = {};

    constructor(url: string) {
        this.URL = url;
    }

    async makeRequest(url?: string): Promise<string> {
        const targetUrl = url || this.URL;
        try {
            const res = await fetch(targetUrl, {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
                },
            });
            if (!res.ok) {
                throw new Error(`HTTP Error: ${res.status} ${res.statusText} for URL: ${targetUrl}`);
            }
            return await res.text();
        } catch (e: any) {
            throw new Error(`Request failed for URL ${targetUrl}: ${e.message}`);
        }
    }

    async makeRequestJson(url: string): Promise<any> {
        try {
            const res = await fetch(url, {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
                },
            });
            if (!res.ok) {
                throw new Error(`HTTP Error: ${res.status} ${res.statusText} for URL: ${url}`);
            }
            return await res.json();
        } catch (e: any) {
            throw new Error(`JSON request failed for URL ${url}: ${e.message}`);
        }
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
