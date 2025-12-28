import { useState, useEffect } from 'react';
import './index.css';

// Types
interface Currency {
    code: string;
    symbol: string;
    name: string;
    locale: string;
}

interface Destination {
    id: number;
    destination: string;
    country: string;
    estimatedFlightCost: string;
    estimatedHotelCost: string;
    estimatedDailyCost: string;
    totalEstimate: string;
    highlights: string[];
    source: string;
    confidence: 'high' | 'medium' | 'low';
}

type Page = 'cars' | 'travel';

function App() {
    const [currentPage, setCurrentPage] = useState<Page>('cars');

    return (
        <div className="app">
            {/* Background Effects */}
            <div className="bg-gradient" />
            <div className="bg-grid" />

            {/* Header */}
            {/* <header className="header">
                <nav className="nav-links">
                    <a
                        href="#travel"
                        className={currentPage === 'travel' ? 'active' : ''}
                        onClick={(e) => { e.preventDefault(); setCurrentPage('travel'); }}
                    >
                        ✈️ Travel Planner
                    </a>
                </nav>
            </header> */}

            {currentPage === 'travel' ? <CarFinderPage /> : <TravelPlannerPage />}

            {/* Footer */}
            <footer className="footer">
                <p>Built with ❤️ using React & Elysia</p>
            </footer>
        </div>
    );
}

// ============================================================================
// CAR FINDER PAGE
// ============================================================================

interface Country {
    code: string;
    name: string;
    currency: string;
    currencySymbol: string;
    locale: string;
}

interface Car {
    id: number;
    make: string;
    model: string;
    name: string;
    year: number;
    price: number;
    emi: number;
    fuelType: string;
    bodyType: string;
}

type EmploymentType = 'salaried' | 'self-employed' | '';

function CarFinderPage() {
    const [countries, setCountries] = useState<Country[]>([]);
    const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
    const [annualIncome, setAnnualIncome] = useState<string>('');
    const [employmentType, setEmploymentType] = useState<EmploymentType>('');
    const [suggestedCars, setSuggestedCars] = useState<Car[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetch('/api/cars/countries')
            .then(res => res.json())
            .then((data: any) => {
                setCountries(data.data);
                const india = data.data.find((c: Country) => c.code === 'IN');
                if (india) setSelectedCountry(india);
            })
            .catch(err => console.error('Failed to fetch countries:', err));
    }, []);

    const formatCurrency = (amount: number) => {
        if (!selectedCountry) return amount.toString();
        return new Intl.NumberFormat(selectedCountry.locale, {
            style: 'currency',
            currency: selectedCountry.currency,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCountry) return;

        setIsLoading(true);
        setHasSearched(true);

        try {
            const income = parseFloat(annualIncome) || 0;
            const maxMonthlyEmi = (income * 0.30) / 12;
            const maxBudget = maxMonthlyEmi * 60;

            const response = await fetch(`/api/cars/suggestions/${selectedCountry.code}?maxBudget=${maxBudget}`);
            const data: any = await response.json();

            const sortedCars = data.data
                .sort((a: Car, b: Car) => b.price - a.price)
                .slice(0, 10);

            setSuggestedCars(sortedCars);
        } catch (error) {
            console.error('Failed to fetch car suggestions:', error);
            setSuggestedCars([]);
        } finally {
            setIsLoading(false);
        }
    };

    const getCountryFlag = (code: string) => {
        const flags: Record<string, string> = { US: '🇺🇸', BR: '🇧🇷', IN: '🇮🇳' };
        return flags[code] || '🌍';
    };

    return (
        <>
            <section className="hero">
                <div className="hero-badge">
                    <span className="hero-badge-dot" />
                    Smart Car Financing
                </div>
                <h1>Find your <span>perfect car</span> within your budget</h1>
                <p>Select your country, enter your financial details, and we'll suggest cars that fit your budget.</p>
            </section>

            <main className="main-content">
                <div className="form-card">
                    <h2>Your Financial Details</h2>
                    <p>Fill in your details to get personalized car recommendations</p>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Select Country</label>
                            <div className="country-selector">
                                {countries.map((country) => (
                                    <button
                                        key={country.code}
                                        type="button"
                                        className={`country-option ${selectedCountry?.code === country.code ? 'active' : ''}`}
                                        onClick={() => {
                                            setSelectedCountry(country);
                                            setSuggestedCars([]);
                                            setHasSearched(false);
                                        }}
                                    >
                                        <span className="country-flag">{getCountryFlag(country.code)}</span>
                                        <span className="country-name">{country.name}</span>
                                        <span className="country-currency">{country.currencySymbol}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="income">Annual Income</label>
                            <div className="input-wrapper">
                                <span className="input-prefix">{selectedCountry?.currencySymbol || '$'}</span>
                                <input
                                    type="number"
                                    id="income"
                                    className="form-input"
                                    placeholder="Enter your annual income"
                                    value={annualIncome}
                                    onChange={(e) => setAnnualIncome(e.target.value)}
                                    min="0"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Employment Type</label>
                            <div className="radio-group">
                                <div className="radio-option">
                                    <input type="radio" id="salaried" name="employment" value="salaried"
                                        checked={employmentType === 'salaried'}
                                        onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                                        required
                                    />
                                    <label htmlFor="salaried" className="radio-label">
                                        <span className="radio-icon">💼</span>
                                        <span className="radio-title">Salaried</span>
                                        <span className="radio-desc">Regular monthly income</span>
                                    </label>
                                </div>
                                <div className="radio-option">
                                    <input type="radio" id="self-employed" name="employment" value="self-employed"
                                        checked={employmentType === 'self-employed'}
                                        onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                                    />
                                    <label htmlFor="self-employed" className="radio-label">
                                        <span className="radio-icon">🏢</span>
                                        <span className="radio-title">Self-Employed</span>
                                        <span className="radio-desc">Business or freelance</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="submit-btn" disabled={isLoading}>
                            {isLoading ? 'Finding Cars...' : 'Find My Cars →'}
                        </button>
                    </form>
                </div>

                <div className="results-card">
                    <h2>Recommended Cars</h2>
                    <p>Cars that match your financial profile
                        {selectedCountry && <span className="results-country"> in {getCountryFlag(selectedCountry.code)} {selectedCountry.name}</span>}
                    </p>

                    {!hasSearched ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">🚗</div>
                            <p>Enter your details and click "Find My Cars" to see personalized recommendations</p>
                        </div>
                    ) : isLoading ? (
                        <div className="empty-state">
                            <div className="empty-state-icon loading">⏳</div>
                            <p>Finding the best cars for you...</p>
                        </div>
                    ) : suggestedCars.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">😔</div>
                            <p>No cars found within your budget.</p>
                        </div>
                    ) : (
                        <div className="car-list">
                            {suggestedCars.map((car) => (
                                <div key={car.id} className="car-card">
                                    <div className="car-image">
                                        {car.bodyType === 'SUV' ? '🚙' : car.bodyType === 'Sedan' ? '🚗' :
                                            car.bodyType === 'Hatchback' ? '🚘' : car.bodyType === 'Truck' ? '🛻' :
                                                car.bodyType === 'MPV' ? '🚐' : '🚗'}
                                    </div>
                                    <div className="car-info">
                                        <div className="car-name">{car.name}</div>
                                        <div className="car-details">
                                            <span className="car-price">{formatCurrency(car.price)}</span>
                                            <span className="car-type">{car.fuelType} • {car.bodyType}</span>
                                        </div>
                                    </div>
                                    <div className="car-emi">
                                        <span className="emi-amount">{formatCurrency(car.emi)}</span>
                                        <span className="emi-label">per month</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}

// ============================================================================
// TRAVEL PLANNER PAGE
// ============================================================================

type StayType = 'hostel' | '2-star' | '3-star' | '4-star' | '5-star';

function TravelPlannerPage() {
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
    const [origin, setOrigin] = useState<string>('');
    const [budget, setBudget] = useState<string>('');
    const [days, setDays] = useState<string>('7');
    const [travelers, setTravelers] = useState<string>('1');
    const [stayType, setStayType] = useState<StayType>('3-star');
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [aiSummary, setAiSummary] = useState<string>('');
    const [hasSearched, setHasSearched] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetch('/api/travel/currencies')
            .then(res => res.json())
            .then((data: any) => {
                setCurrencies(data.data);
                const inr = data.data.find((c: Currency) => c.code === 'INR');
                if (inr) setSelectedCurrency(inr);
            })
            .catch(err => console.error('Failed to fetch currencies:', err));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCurrency) return;

        setIsLoading(true);
        setHasSearched(true);
        setAiSummary('');

        try {
            const response = await fetch('/api/travel/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    origin,
                    budget: parseFloat(budget) || 0,
                    currency: selectedCurrency.code,
                    days: parseInt(days) || 7,
                    travelers: parseInt(travelers) || 1,
                    stayType,
                }),
            });

            const data: any = await response.json();
            setDestinations(data.destinations || []);
            setAiSummary(data.aiSummary || '');
        } catch (error) {
            console.error('Failed to search destinations:', error);
            setDestinations([]);
        } finally {
            setIsLoading(false);
        }
    };

    const getConfidenceColor = (confidence: string) => {
        if (confidence === 'high') return '#22c55e';
        if (confidence === 'medium') return '#f59e0b';
        return '#94a3b8';
    };

    const stayOptions: { value: StayType; label: string; icon: string }[] = [
        { value: 'hostel', label: 'Hostel', icon: '🛏️' },
        { value: '2-star', label: '2 Star', icon: '⭐⭐' },
        { value: '3-star', label: '3 Star', icon: '⭐⭐⭐' },
        { value: '4-star', label: '4 Star', icon: '⭐⭐⭐⭐' },
        { value: '5-star', label: '5 Star', icon: '⭐⭐⭐⭐⭐' },
    ];

    return (
        <>
            <section className="hero">
                <div className="hero-badge">
                    <span className="hero-badge-dot" />
                    AI-Powered Travel Planning
                </div>
                <h1>Where can you <span>travel</span> with your budget?</h1>
                <p>Enter your origin, budget, and trip duration. We'll find destinations that fit your financial plan.</p>
            </section>

            <main className="main-content">
                <div className="form-card">
                    <h2>Plan Your Trip</h2>
                    <p>Tell us about your travel plans and budget</p>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Select Currency</label>
                            <div className="currency-selector">
                                {currencies.slice(0, 4).map((currency) => (
                                    <button
                                        key={currency.code}
                                        type="button"
                                        className={`currency-option ${selectedCurrency?.code === currency.code ? 'active' : ''}`}
                                        onClick={() => setSelectedCurrency(currency)}
                                    >
                                        <span className="currency-symbol">{currency.symbol}</span>
                                        <span className="currency-code">{currency.code}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="currency-selector" style={{ marginTop: '0.5rem' }}>
                                {currencies.slice(4).map((currency) => (
                                    <button
                                        key={currency.code}
                                        type="button"
                                        className={`currency-option ${selectedCurrency?.code === currency.code ? 'active' : ''}`}
                                        onClick={() => setSelectedCurrency(currency)}
                                    >
                                        <span className="currency-symbol">{currency.symbol}</span>
                                        <span className="currency-code">{currency.code}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="origin">Traveling From</label>
                            <div className="input-wrapper">
                                <span className="input-prefix">📍</span>
                                <input
                                    type="text"
                                    id="origin"
                                    className="form-input"
                                    placeholder="e.g., Mumbai, New York, London"
                                    value={origin}
                                    onChange={(e) => setOrigin(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group" style={{ flex: 1 }}>
                                <label htmlFor="budget">Total Budget</label>
                                <div className="input-wrapper">
                                    <span className="input-prefix">{selectedCurrency?.symbol || '$'}</span>
                                    <input
                                        type="number"
                                        id="budget"
                                        className="form-input"
                                        placeholder="Enter budget"
                                        value={budget}
                                        onChange={(e) => setBudget(e.target.value)}
                                        min="0"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label htmlFor="days">Trip Duration</label>
                                <div className="input-wrapper">
                                    <span className="input-prefix">📅</span>
                                    <input
                                        type="number"
                                        id="days"
                                        className="form-input"
                                        placeholder="Days"
                                        value={days}
                                        onChange={(e) => setDays(e.target.value)}
                                        min="1"
                                        max="90"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group" style={{ flex: 1 }}>
                                <label htmlFor="travelers">Number of Travelers</label>
                                <div className="input-wrapper">
                                    <span className="input-prefix">👥</span>
                                    <input
                                        type="number"
                                        id="travelers"
                                        className="form-input"
                                        placeholder="Travelers"
                                        value={travelers}
                                        onChange={(e) => setTravelers(e.target.value)}
                                        min="1"
                                        max="20"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Accommodation Type</label>
                            <div className="stay-selector">
                                {stayOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        className={`stay-option ${stayType === option.value ? 'active' : ''}`}
                                        onClick={() => setStayType(option.value)}
                                    >
                                        <span className="stay-icon">{option.icon}</span>
                                        <span className="stay-label">{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button type="submit" className="submit-btn" disabled={isLoading}>
                            {isLoading ? 'Searching Destinations...' : 'Find Destinations ✈️'}
                        </button>
                    </form>
                </div>

                <div className="results-card travel-results">
                    <h2>Destination Suggestions</h2>
                    <p>Places you can visit within your budget</p>

                    {!hasSearched ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">✈️</div>
                            <p>Enter your travel details to discover destinations within your budget</p>
                        </div>
                    ) : isLoading ? (
                        <div className="empty-state">
                            <div className="empty-state-icon loading">🌍</div>
                            <p>Searching for the best destinations...</p>
                        </div>
                    ) : destinations.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">😔</div>
                            <p>No destinations found within your budget. Try increasing your budget or trip duration.</p>
                        </div>
                    ) : (
                        <>
                            {aiSummary && (
                                <div className="ai-summary">
                                    <div className="ai-summary-header">
                                        <span className="ai-icon">🤖</span>
                                        <span>AI Insights</span>
                                    </div>
                                    <p>{aiSummary.substring(0, 300)}...</p>
                                </div>
                            )}
                            <div className="destination-list">
                                {destinations.map((dest) => (
                                    <div key={dest.id} className="destination-card">
                                        <div className="destination-header">
                                            <div className="destination-name">{dest.destination}</div>
                                            <div
                                                className="confidence-badge"
                                                style={{ backgroundColor: getConfidenceColor(dest.confidence) }}
                                            >
                                                {dest.confidence}
                                            </div>
                                        </div>
                                        <div className="destination-country">{dest.country}</div>

                                        <div className="cost-breakdown">
                                            <div className="cost-item">
                                                <span className="cost-icon">✈️</span>
                                                <span className="cost-label">Flights</span>
                                                <span className="cost-value">{dest.estimatedFlightCost}</span>
                                            </div>
                                            <div className="cost-item">
                                                <span className="cost-icon">🏨</span>
                                                <span className="cost-label">Hotels</span>
                                                <span className="cost-value">{dest.estimatedHotelCost}</span>
                                            </div>
                                            <div className="cost-item">
                                                <span className="cost-icon">🍽️</span>
                                                <span className="cost-label">Food & Activities</span>
                                                <span className="cost-value">{dest.estimatedDailyCost}</span>
                                            </div>
                                        </div>

                                        <div className="destination-highlights">
                                            {dest.highlights.map((h, i) => (
                                                <span key={i} className="highlight-tag">{h}</span>
                                            ))}
                                        </div>

                                        <div className="destination-footer">
                                            <div className="total-cost">
                                                <span className="total-label">Total Estimate:</span>
                                                <span className="total-value">{dest.totalEstimate}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </main>
        </>
    );
}

export default App;
