/**
 * LangGraph Travel Agent with Tavily Search
 * Uses create_react_agent with Tavily tool and LangChain OpenAI
 */

import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { TavilySearch } from "@langchain/tavily";

// Type definitions for our travel data
interface TravelDestination {
    destination: string;
    country: string;
    flightCostUSD: number;
    hotelPerNightUSD: number;
    dailyBudgetUSD: number;
    highlights: string[];
    bestTimeToVisit: string;
}

interface TravelSearchResponse {
    destinations: TravelDestination[];
    summary: string;
    searchDate: string;
}

// Initialize the LLM
const llm = new ChatOpenAI({
    model: "gpt-4o",
    temperature: 0,
    openAIApiKey: process.env.OPENAI_API_KEY,
});

// Initialize Tavily search tool
const tavilyTool = new TavilySearch({
    maxResults: 5,
});

// Create the React agent with tools
const agent = createReactAgent({
    llm,
    tools: [tavilyTool],
});

async function searchTravelDestinations(
    origin: string,
    budgetUSD: number,
    days: number
): Promise<TravelSearchResponse | null> {
    console.log('🔍 Searching for travel destinations...');
    console.log(`   Origin: ${origin}`);
    console.log(`   Budget: $${budgetUSD} USD`);
    console.log(`   Duration: ${days} days`);
    console.log('');

    // Structured prompt to get consistent JSON output
    const prompt = `
You are a travel advisor. Search for budget travel destinations from ${origin} for a ${days}-day trip with a total budget of $${budgetUSD} USD.

Use the Tavily search tool to find current 2024/2025 travel prices including:
- Round trip flight costs from ${origin}
- Average hotel prices per night
- Daily food and activity budgets

After searching, return ONLY a JSON object in this exact format (no markdown, no explanation):

{
    "destinations": [
        {
            "destination": "City Name",
            "country": "Country Name",
            "flightCostUSD": 500,
            "hotelPerNightUSD": 80,
            "dailyBudgetUSD": 50,
            "highlights": ["highlight1", "highlight2", "highlight3"],
            "bestTimeToVisit": "Month - Month"
        }
    ],
    "summary": "A brief summary of the best budget travel options found",
    "searchDate": "${new Date().toISOString().split('T')[0]}"
}

Find 5-8 destinations that fit within the $${budgetUSD} budget for ${days} days.
Use real prices you find from the search results.
Return ONLY the JSON object, nothing else.
`;

    try {
        // Invoke the agent
        const result = await agent.invoke({
            messages: [{ role: "user", content: prompt }],
        });

        // Get the last message from the agent (the response)
        const lastMessage = result.messages[result.messages.length - 1];
        const content = typeof lastMessage.content === 'string'
            ? lastMessage.content
            : JSON.stringify(lastMessage.content);

        console.log('✅ Agent Response received');
        console.log('');

        // Clean up the response - remove markdown code blocks if present
        const cleanJson = content
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        try {
            const parsed = JSON.parse(cleanJson) as TravelSearchResponse;

            console.log('🌍 Travel Destinations Found:');
            console.log('═══════════════════════════════════════════════════════════');

            for (const dest of parsed.destinations) {
                const totalCost = dest.flightCostUSD + (dest.hotelPerNightUSD * days) + (dest.dailyBudgetUSD * days);
                console.log('');
                console.log(`📍 ${dest.destination}, ${dest.country}`);
                console.log(`   ✈️  Flight: $${dest.flightCostUSD}`);
                console.log(`   🏨 Hotel: $${dest.hotelPerNightUSD}/night ($${dest.hotelPerNightUSD * days} total)`);
                console.log(`   🍽️  Daily: $${dest.dailyBudgetUSD}/day ($${dest.dailyBudgetUSD * days} total)`);
                console.log(`   💰 Total (${days} days): $${totalCost}`);
                console.log(`   ⭐ ${dest.highlights.join(', ')}`);
                console.log(`   📅 Best time: ${dest.bestTimeToVisit}`);
            }

            console.log('');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('📝 Summary:', parsed.summary);

            return parsed;
        } catch (parseError) {
            console.error('⚠️  Could not parse response as JSON');
            console.log('Raw response:', content);
            return null;
        }
    } catch (error) {
        console.error('❌ Agent error:', error);
        return null;
    }
}

// Run the test
async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  LangGraph Travel Agent (GPT-4o + Tavily Search)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    // Check for API keys
    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY not set in environment');
        process.exit(1);
    }
    if (!process.env.TAVILY_API_KEY) {
        console.error('❌ TAVILY_API_KEY not set in environment');
        process.exit(1);
    }

    // Test parameters
    const origin = 'New York';
    const budgetUSD = 2000;
    const days = 7;

    const result = await searchTravelDestinations(origin, budgetUSD, days);

    console.log('');
    if (result) {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  ✅ Test completed successfully!');
        console.log('═══════════════════════════════════════════════════════════');
    } else {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  ❌ Test failed - check the errors above');
        console.log('═══════════════════════════════════════════════════════════');
    }
}

main();
