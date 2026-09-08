/**
 * NEXT.JS ROUTE HANDLER HTTP CLIENT TEST HARNESS
 * 
 * Provides an in-memory caller for Next.js App Router route handlers (`POST`, `GET`, etc.)
 * by creating standard `NextRequest` instances and parsing `NextResponse` results.
 */

import { NextRequest, NextResponse } from "next/server";

export interface MockRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  searchParams?: Record<string, string>;
}

export class MockHttpClient {
  /**
   * Constructs a mock NextRequest object.
   */
  public static createRequest(
    path: string,
    options: MockRequestOptions = {}
  ): NextRequest {
    const { method = "GET", headers = {}, body, searchParams = {} } = options;

    let url = `http://localhost:3000${path.startsWith("/") ? path : `/${path}`}`;
    const urlObj = new URL(url);
    for (const [k, v] of Object.entries(searchParams)) {
      urlObj.searchParams.set(k, v);
    }

    const reqHeaders = new Headers();
    reqHeaders.set("host", "localhost:3000");
    for (const [key, val] of Object.entries(headers)) {
      reqHeaders.set(key, val);
    }

    let reqBody: string | undefined;
    if (body !== undefined) {
      if (typeof body === "string") {
        reqBody = body;
      } else {
        reqBody = JSON.stringify(body);
        if (!reqHeaders.has("content-type")) {
          reqHeaders.set("content-type", "application/json");
        }
      }
    }

    return new NextRequest(urlObj.toString(), {
      method,
      headers: reqHeaders,
      body: reqBody,
    });
  }

  /**
   * Helper to parse a NextResponse JSON body.
   */
  public static async parseJsonResponse(response: NextResponse): Promise<{
    status: number;
    data: any;
    headers: Headers;
  }> {
    const status = response.status;
    let data: any = null;
    try {
      data = await response.json();
    } catch {
      // Body might be plain text or empty
      try {
        data = await response.text();
      } catch {
        data = null;
      }
    }

    return {
      status,
      data,
      headers: response.headers,
    };
  }
}
