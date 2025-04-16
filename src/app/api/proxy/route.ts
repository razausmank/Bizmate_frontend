import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: NextRequest) {
  // Get the search params from the request URL
  const searchParams = request.nextUrl.searchParams;
  const host = searchParams.get("host");
  const endpoint = searchParams.get("endpoint");

  // Validate parameters
  if (!host || !endpoint) {
    return NextResponse.json(
      { error: "Missing host or endpoint parameters" },
      { status: 400 }
    );
  }

  try {
    // Extract headers from the original request
    const apiKey = request.headers.get("X-API-Key");
    
    // Prepare headers for the forwarded request
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }

    // Forward the request to the actual API
    console.log(`Proxying GET request to: http://${host}/${endpoint}`);
    const response = await axios.get(`http://${host}/${endpoint}`, { headers });
    
    // Return the API response
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error(`Proxy error for GET ${endpoint}:`, error);
    
    // Extract more detailed error information if available
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.detail || error.message || "Unknown error";
    
    return NextResponse.json(
      { 
        error: "Failed to proxy request", 
        details: errorMessage,
        status: statusCode
      },
      { status: statusCode }
    );
  }
}

export async function POST(request: NextRequest) {
  // Get the search params from the request URL
  const searchParams = request.nextUrl.searchParams;
  const host = searchParams.get("host");
  const endpoint = searchParams.get("endpoint");

  // Validate parameters
  if (!host || !endpoint) {
    return NextResponse.json(
      { error: "Missing host or endpoint parameters" },
      { status: 400 }
    );
  }

  try {
    // Extract headers from the original request
    const apiKey = request.headers.get("X-API-Key");
    
    // Prepare headers for the forwarded request
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }

    // Get the request body
    const body = await request.json();
    
    // Log the request (without sensitive data)
    console.log(`Proxying POST request to: http://${host}/${endpoint}`, {
      body: JSON.stringify(body),
      hasApiKey: !!apiKey
    });

    // Add timeout to prevent hanging requests
    const response = await axios.post(
      `http://${host}/${endpoint}`, 
      body, 
      { 
        headers,
        timeout: 15000 // 15 seconds timeout
      }
    );
    
    // Return the API response
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error(`Proxy error for POST ${endpoint}:`, error);
    
    // Extract more detailed error information if available
    const statusCode = error.response?.status || 500;
    let errorMessage = error.response?.data?.detail || error.message || "Unknown error";
    let errorResponse = error.response?.data || {};
    
    // If we have a response body from the server, include it for debugging
    if (error.response?.data) {
      console.log(`Server response body:`, JSON.stringify(error.response.data));
    }
    
    return NextResponse.json(
      { 
        error: "Failed to proxy request", 
        details: errorMessage,
        status: statusCode,
        errorResponse
      },
      { status: statusCode }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Get the search params from the request URL
  const searchParams = request.nextUrl.searchParams;
  const host = searchParams.get("host");
  const endpoint = searchParams.get("endpoint");

  // Validate parameters
  if (!host || !endpoint) {
    return NextResponse.json(
      { error: "Missing host or endpoint parameters" },
      { status: 400 }
    );
  }

  try {
    // Extract headers from the original request
    const apiKey = request.headers.get("X-API-Key");
    
    // Prepare headers for the forwarded request
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }

    // Forward the request to the actual API
    console.log(`Proxying DELETE request to: http://${host}/${endpoint}`);
    const response = await axios.delete(`http://${host}/${endpoint}`, { headers });
    
    // Return the API response
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error(`Proxy error for DELETE ${endpoint}:`, error);
    
    // Extract more detailed error information if available
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.detail || error.message || "Unknown error";
    
    return NextResponse.json(
      { 
        error: "Failed to proxy request", 
        details: errorMessage,
        status: statusCode
      },
      { status: statusCode }
    );
  }
} 