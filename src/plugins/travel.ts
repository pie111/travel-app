/**
 * Travel Budget Planner Plugin
 * Uses LangGraph React Agent with Tavily Search for dynamic travel data
 */

import { Elysia, t } from 'elysia';
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { TavilySearch } from "@langchain/tavily";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

// Supported currencies (for validation only, agent handles conversion)
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'BRL', 'JPY', 'AUD', 'CAD'] as const;

const CURRENCY_INFO: Record<string, { symbol: string; name: string; locale: string }> = {
    USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
    EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' },
    GBP: { symbol: '£', name: 'British Pound', locale: 'en-GB' },
    INR: { symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
    BRL: { symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR' },
    JPY: { symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
    AUD: { symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
    CAD: { symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
};

// Type definitions for LangGraph agent response
interface TravelDestination {
    destination: string;
    country: string;
    flightCost: number;
    hotelPerNight: number;
    dailyBudget: number;
    totalCost: number;
    highlights: string[];
    bestTimeToVisit: string;
}

interface AgentTravelResponse {
    destinations: TravelDestination[];
    summary: string;
    currency: string;
    searchDate: string;
}

// Initialize the LangGraph agent (lazy initialization)
let agent: ReturnType<typeof createReactAgent> | null = null;

function getAgent() {
    if (!agent && OPENAI_API_KEY && TAVILY_API_KEY) {
        const llm = new ChatOpenAI({
            model: "gpt-4o",
            temperature: 0,
            openAIApiKey: OPENAI_API_KEY,
        });

        const tavilyTool = new TavilySearch({
            maxResults: 5,
        });

        agent = createReactAgent({
            llm,
            tools: [tavilyTool],
        });
    }
    return agent;
}

// Stay type labels for the prompt
const STAY_TYPE_LABELS: Record<string, string> = {
    'hostel': 'hostels or dormitory-style accommodation',
    '2-star': '2-star budget hotels',
    '3-star': '3-star mid-range hotels',
    '4-star': '4-star hotels',
    '5-star': '5-star luxury hotels',
};

// Search using LangGraph agent with Tavily
async function searchWithAgent(
    origin: string,
    budget: number,
    currency: string,
    days: number,
    travelers: number,
    stayType: string
): Promise<AgentTravelResponse | null> {
    const agentInstance = getAgent();
    if (!agentInstance) {
        console.error('LangGraph agent not initialized - missing API keys');
        return null;
    }

    const currencySymbol = CURRENCY_INFO[currency]?.symbol || currency;

    const prompt = `
You are an expert travel advisor. Think step-by-step to find accurate, realistic travel prices.

TASK: Find travel destinations from ${origin} for ${travelers} traveler(s) on a ${days}-day trip with a budget of ${currencySymbol}${budget} ${currency}.

STEP 1: SEARCH FOR REAL PRICES
Use the Tavily search tool to find ACTUAL 2024/2025 prices. Search for:
- "round trip flights from ${origin} to [destination] price ${currency}"
- "[destination] ${stayType} hotel prices per night"
- "[destination] daily travel budget food transport"

STEP 2: VALIDATE PRICES (CRITICAL)
Before including any destination, verify the prices make sense:

FLIGHT PRICE VALIDATION (round-trip per person):
- Within same continent (e.g., India to SE Asia): ${currency === 'INR' ? '₹15,000 - ₹35,000' : '$200 - $500'}
- Cross-continental (e.g., India to Europe): ${currency === 'INR' ? '₹40,000 - ₹80,000' : '$600 - $1200'}  
- Long-haul (e.g., India to USA/Australia): ${currency === 'INR' ? '₹60,000 - ₹120,000' : '$800 - $1500'}

HOTEL PRICE VALIDATION (per night):
- Hostel: ${currency === 'INR' ? '₹500 - ₹2,000' : '$10 - $40'}
- 2-star: ${currency === 'INR' ? '₹1,500 - ₹4,000' : '$25 - $60'}
- 3-star: ${currency === 'INR' ? '₹3,000 - ₹8,000' : '$50 - $120'}
- 4-star: ${currency === 'INR' ? '₹6,000 - ₹15,000' : '$100 - $250'}
- 5-star: ${currency === 'INR' ? '₹12,000 - ₹50,000' : '$200 - $600'}

DAILY BUDGET VALIDATION (food + transport + activities):
- Budget travel in Asia: ${currency === 'INR' ? '₹1,500 - ₹3,000' : '$20 - $50'} per day
- Budget travel in Europe: ${currency === 'INR' ? '₹4,000 - ₹8,000' : '$60 - $120'} per day
- Budget travel in USA: ${currency === 'INR' ? '₹5,000 - ₹10,000' : '$80 - $150'} per day

⚠️ If a price seems too low (e.g., international flight under ₹10,000 or $150), it's WRONG. Do not include it.

STEP 3: CALCULATE TOTALS
For ${travelers} traveler(s) with ${STAY_TYPE_LABELS[stayType] || '3-star hotels'}:
- Total flights = flightCost × ${travelers}
- Total hotels = hotelPerNight × ${days} nights
- Total daily = dailyBudget × ${days} days × ${travelers} people
- Grand total = flights + hotels + daily ≤ ${currencySymbol}${budget}

STEP 4: RETURN JSON
All prices in ${currency}. Only include destinations where you found REAL price data and the total fits the budget.

{
    "destinations": [
        {
            "destination": "City Name",
            "country": "Country Name",
            "flightCost": 45000,
            "hotelPerNight": 3500,
            "dailyBudget": 2000,
            "totalCost": 83500,
            "highlights": ["highlight1", "highlight2", "highlight3"],
            "bestTimeToVisit": "Month - Month"
        }
    ],
    "summary": "Brief summary of options found",
    "currency": "${currency}",
    "searchDate": "${new Date().toISOString().split('T')[0]}"
}

Return ONLY the JSON object. No markdown, no explanation.
`;

    try {
        const result = await agentInstance.invoke({
            messages: [{ role: "user", content: prompt }],
        });

        const lastMessage = result.messages[result.messages.length - 1];
        const content = typeof lastMessage.content === 'string'
            ? lastMessage.content
            : JSON.stringify(lastMessage.content);

        // Clean up the response
        const cleanJson = content
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        return JSON.parse(cleanJson) as AgentTravelResponse;
    } catch (error) {
        console.error('LangGraph agent error:', error);
        return null;
    }
}

// Get emoji for destination
function getEmoji(destination: string): string {
    const emojiMap: Record<string, string> = {
        'Lisbon': '🇵🇹', 'Porto': '🇵🇹', 'Portugal': '🇵🇹',
        'Barcelona': '🇪🇸', 'Madrid': '🇪🇸', 'Spain': '🇪🇸',
        'Paris': '🇫🇷', 'France': '🇫🇷', 'Strasbourg': '🇫🇷',
        'Rome': '🇮🇹', 'Milan': '🇮🇹', 'Florence': '🇮🇹', 'Italy': '🇮🇹',
        'Berlin': '🇩🇪', 'Munich': '🇩🇪', 'Germany': '🇩🇪',
        'London': '🇬🇧', 'UK': '🇬🇧',
        'Athens': '🇬🇷', 'Santorini': '🇬🇷', 'Greece': '🇬🇷',
        'Istanbul': '🇹🇷', 'Turkey': '🇹🇷',
        'Bangkok': '🇹🇭', 'Thailand': '🇹🇭',
        'Tokyo': '🇯🇵', 'Osaka': '🇯🇵', 'Japan': '🇯🇵',
        'Bali': '🇮🇩', 'Jakarta': '🇮🇩', 'Indonesia': '🇮🇩',
        'Singapore': '🇸🇬',
        'Dubai': '🇦🇪', 'UAE': '🇦🇪',
        'Mexico City': '🇲🇽', 'Cancun': '🇲🇽', 'Mexico': '🇲🇽',
        'Guatemala': '🇬🇹', 'Guatemala City': '🇬🇹', 'Belize': '🇧🇿',
        'Colombia': '🇨🇴', 'Bogota': '🇨🇴', 'Medellin': '🇨🇴',
        'Peru': '🇵🇪', 'Lima': '🇵🇪',
        'Argentina': '🇦🇷', 'Buenos Aires': '🇦🇷',
        'Brazil': '🇧🇷', 'Rio': '🇧🇷', 'Sao Paulo': '🇧🇷',
        'Costa Rica': '🇨🇷',
        'Prague': '🇨🇿', 'Czech': '🇨🇿',
        'Budapest': '🇭🇺', 'Hungary': '🇭🇺',
        'Vienna': '🇦🇹', 'Austria': '🇦🇹',
        'Amsterdam': '🇳🇱', 'Netherlands': '🇳🇱',
        'Marrakech': '🇲🇦', 'Morocco': '🇲🇦',
        'Cairo': '🇪🇬', 'Egypt': '🇪🇬',
        'Cape Town': '🇿🇦', 'South Africa': '🇿🇦',
        'India': '🇮🇳', 'Delhi': '🇮🇳', 'Mumbai': '🇮🇳', 'Goa': '🇮🇳',
        'Nepal': '🇳🇵', 'Kathmandu': '🇳🇵',
        'Vietnam': '🇻🇳', 'Hanoi': '🇻🇳', 'Ho Chi Minh': '🇻🇳',
        'Maldives': '🇲🇻', 'Mongolia': '🇲🇳', 'Algarve': '��',
    };

    for (const [key, emoji] of Object.entries(emojiMap)) {
        if (destination.toLowerCase().includes(key.toLowerCase())) {
            return emoji;
        }
    }
    return '✈️';
}

export const travelPlugin = new Elysia({ prefix: '/api/travel' })
    // Get supported currencies
    .get('/currencies', () => ({
        data: Object.entries(CURRENCY_INFO).map(([code, info]) => ({
            code,
            symbol: info.symbol,
            name: info.name,
            locale: info.locale,
        })),
        timestamp: new Date().toISOString(),
    }))

    // Search for travel destinations using LangGraph + Tavily
    .post('/search', async ({ body, set }) => {
        const { origin, budget, currency, days, travelers, stayType } = body;

        // Check for required API keys
        if (!OPENAI_API_KEY) {
            set.status = 500;
            return {
                error: 'OpenAI API key not configured',
                message: 'Please add OPENAI_API_KEY to your .env file',
            };
        }

        if (!TAVILY_API_KEY) {
            set.status = 500;
            return {
                error: 'Tavily API key not configured',
                message: 'Please add TAVILY_API_KEY to your .env file',
            };
        }

        if (!SUPPORTED_CURRENCIES.includes(currency as any)) {
            set.status = 400;
            return { error: 'Invalid currency code' };
        }

        const currencyInfo = CURRENCY_INFO[currency];
        const formatter = new Intl.NumberFormat(currencyInfo.locale, {
            style: 'currency',
            currency,
            maximumFractionDigits: 0,
        });

        console.log(`🔍 Searching travel destinations from ${origin} with budget ${formatter.format(budget)} for ${days} days, ${travelers} travelers, ${stayType} accommodation...`);

        // Use LangGraph agent to search (agent handles currency)
        const agentResponse = await searchWithAgent(origin, budget, currency, days, travelers, stayType);

        if (!agentResponse || !agentResponse.destinations.length) {
            set.status = 500;
            return {
                error: 'No destinations found',
                message: 'The travel search did not return any results. Please try again.',
            };
        }

        // Format the response (prices are already in user's currency from agent)
        const destinations = agentResponse.destinations.map((dest, index) => {
            // Determine confidence based on how well it fits the budget
            let confidence: 'high' | 'medium' | 'low' = 'medium';
            if (dest.totalCost < budget * 0.7) {
                confidence = 'high';
            } else if (dest.totalCost > budget * 0.95) {
                confidence = 'low';
            }

            return {
                id: index + 1,
                destination: `${getEmoji(dest.destination)} ${dest.destination}`,
                country: dest.country,
                estimatedFlightCost: formatter.format(dest.flightCost),
                estimatedHotelCost: formatter.format(dest.hotelPerNight * days),
                estimatedDailyCost: formatter.format(dest.dailyBudget * days),
                totalEstimate: formatter.format(dest.totalCost),
                highlights: dest.highlights,
                bestTimeToVisit: dest.bestTimeToVisit,
                source: 'LangGraph + Tavily',
                confidence,
            };
        });

        // Sort by confidence (high first)
        destinations.sort((a, b) => {
            const order = { high: 0, medium: 1, low: 2 };
            return order[a.confidence] - order[b.confidence];
        });

        console.log(`✅ Found ${destinations.length} destinations within budget`);

        return {
            success: true,
            origin,
            budget,
            currency,
            days,
            destinations: destinations.slice(0, 8),
            aiSummary: agentResponse.summary,
            source: 'langgraph-tavily',
            searchInfo: {
                model: 'gpt-4o',
                searchTool: 'Tavily',
                destinationsFound: agentResponse.destinations.length,
            },
            timestamp: new Date().toISOString(),
        };
    }, {
        body: t.Object({
            origin: t.String(),
            budget: t.Number(),
            currency: t.String(),
            days: t.Number(),
            travelers: t.Number(),
            stayType: t.String(),
        }),
    })

    // Health check for travel API
    .get('/health', () => ({
        status: 'ok',
        openaiConfigured: !!OPENAI_API_KEY,
        tavilyConfigured: !!TAVILY_API_KEY,
        agentReady: !!(OPENAI_API_KEY && TAVILY_API_KEY),
        timestamp: new Date().toISOString(),
    }));
