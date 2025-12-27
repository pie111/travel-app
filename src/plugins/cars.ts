/**
 * Cars API Plugin
 * Handles all car-related endpoints with multi-country support
 */

import { Elysia, t } from 'elysia';

// Country configurations with currency info
const COUNTRIES = {
    US: {
        name: 'United States',
        currency: 'USD',
        currencySymbol: '$',
        locale: 'en-US',
    },
    BR: {
        name: 'Brazil',
        currency: 'BRL',
        currencySymbol: 'R$',
        locale: 'pt-BR',
    },
    IN: {
        name: 'India',
        currency: 'INR',
        currencySymbol: '₹',
        locale: 'en-IN',
    },
} as const;

type CountryCode = keyof typeof COUNTRIES;

// Indian cars static data (since no free API available)
const indianCars = [
    { id: 1, make: 'Maruti Suzuki', model: 'Swift', year: 2024, price: 649000, fuelType: 'Petrol', bodyType: 'Hatchback' },
    { id: 2, make: 'Maruti Suzuki', model: 'Baleno', year: 2024, price: 766000, fuelType: 'Petrol', bodyType: 'Hatchback' },
    { id: 3, make: 'Maruti Suzuki', model: 'Alto K10', year: 2024, price: 399000, fuelType: 'Petrol', bodyType: 'Hatchback' },
    { id: 4, make: 'Maruti Suzuki', model: 'Dzire', year: 2024, price: 674000, fuelType: 'Petrol', bodyType: 'Sedan' },
    { id: 5, make: 'Maruti Suzuki', model: 'Brezza', year: 2024, price: 849000, fuelType: 'Petrol', bodyType: 'SUV' },
    { id: 6, make: 'Tata', model: 'Nexon', year: 2024, price: 849000, fuelType: 'Petrol', bodyType: 'SUV' },
    { id: 7, make: 'Tata', model: 'Punch', year: 2024, price: 610000, fuelType: 'Petrol', bodyType: 'SUV' },
    { id: 8, make: 'Tata', model: 'Altroz', year: 2024, price: 675000, fuelType: 'Petrol', bodyType: 'Hatchback' },
    { id: 9, make: 'Tata', model: 'Harrier', year: 2024, price: 1549000, fuelType: 'Diesel', bodyType: 'SUV' },
    { id: 10, make: 'Tata', model: 'Safari', year: 2024, price: 1649000, fuelType: 'Diesel', bodyType: 'SUV' },
    { id: 11, make: 'Tata', model: 'Tiago', year: 2024, price: 549000, fuelType: 'Petrol', bodyType: 'Hatchback' },
    { id: 12, make: 'Hyundai', model: 'i20', year: 2024, price: 749000, fuelType: 'Petrol', bodyType: 'Hatchback' },
    { id: 13, make: 'Hyundai', model: 'Creta', year: 2024, price: 1110000, fuelType: 'Petrol', bodyType: 'SUV' },
    { id: 14, make: 'Hyundai', model: 'Venue', year: 2024, price: 799000, fuelType: 'Petrol', bodyType: 'SUV' },
    { id: 15, make: 'Hyundai', model: 'Verna', year: 2024, price: 1099000, fuelType: 'Petrol', bodyType: 'Sedan' },
    { id: 16, make: 'Mahindra', model: 'XUV700', year: 2024, price: 1399000, fuelType: 'Petrol', bodyType: 'SUV' },
    { id: 17, make: 'Mahindra', model: 'Thar', year: 2024, price: 1099000, fuelType: 'Petrol', bodyType: 'SUV' },
    { id: 18, make: 'Mahindra', model: 'Scorpio N', year: 2024, price: 1399000, fuelType: 'Diesel', bodyType: 'SUV' },
    { id: 19, make: 'Mahindra', model: 'XUV300', year: 2024, price: 849000, fuelType: 'Petrol', bodyType: 'SUV' },
    { id: 20, make: 'Honda', model: 'City', year: 2024, price: 1199000, fuelType: 'Petrol', bodyType: 'Sedan' },
    { id: 21, make: 'Honda', model: 'Amaze', year: 2024, price: 799000, fuelType: 'Petrol', bodyType: 'Sedan' },
    { id: 22, make: 'Honda', model: 'Elevate', year: 2024, price: 1110000, fuelType: 'Petrol', bodyType: 'SUV' },
    { id: 23, make: 'Toyota', model: 'Innova Crysta', year: 2024, price: 1999000, fuelType: 'Diesel', bodyType: 'MPV' },
    { id: 24, make: 'Toyota', model: 'Fortuner', year: 2024, price: 3399000, fuelType: 'Diesel', bodyType: 'SUV' },
    { id: 25, make: 'Toyota', model: 'Urban Cruiser Hyryder', year: 2024, price: 1199000, fuelType: 'Hybrid', bodyType: 'SUV' },
    { id: 26, make: 'Kia', model: 'Seltos', year: 2024, price: 1099000, fuelType: 'Petrol', bodyType: 'SUV' },
    { id: 27, make: 'Kia', model: 'Sonet', year: 2024, price: 799000, fuelType: 'Petrol', bodyType: 'SUV' },
    { id: 28, make: 'Kia', model: 'Carens', year: 2024, price: 1049000, fuelType: 'Petrol', bodyType: 'MPV' },
    { id: 29, make: 'MG', model: 'Hector', year: 2024, price: 1449000, fuelType: 'Petrol', bodyType: 'SUV' },
    { id: 30, make: 'MG', model: 'Astor', year: 2024, price: 1049000, fuelType: 'Petrol', bodyType: 'SUV' },
];

// Fetch US car makes from NHTSA API
async function fetchUSMakes(): Promise<{ Make_ID: number; Make_Name: string }[]> {
    try {
        const response = await fetch('https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=json');
        const data = await response.json();
        // Filter to common passenger car makes
        const commonMakes = ['Honda', 'Toyota', 'Ford', 'Chevrolet', 'BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Hyundai', 'Kia', 'Nissan', 'Mazda', 'Subaru', 'Tesla', 'Jeep', 'Ram', 'GMC', 'Cadillac', 'Lexus', 'Acura'];
        return data.Results.filter((make: any) => commonMakes.includes(make.Make_Name));
    } catch (error) {
        console.error('Error fetching US makes:', error);
        return [];
    }
}

// Fetch US car models from NHTSA API
async function fetchUSModels(make: string): Promise<any[]> {
    try {
        const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${encodeURIComponent(make)}?format=json`);
        const data = await response.json();
        return data.Results.slice(0, 20); // Limit to 20 models
    } catch (error) {
        console.error('Error fetching US models:', error);
        return [];
    }
}

// Fetch Brazilian car makes from FIPE API
async function fetchBrazilMakes(): Promise<{ codigo: string; nome: string }[]> {
    try {
        const response = await fetch('https://parallelum.com.br/fipe/api/v1/carros/marcas');
        return await response.json();
    } catch (error) {
        console.error('Error fetching Brazil makes:', error);
        return [];
    }
}

// Fetch Brazilian car models from FIPE API
async function fetchBrazilModels(makeCode: string): Promise<any[]> {
    try {
        const response = await fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${makeCode}/modelos`);
        const data = await response.json();
        return data.modelos?.slice(0, 20) || [];
    } catch (error) {
        console.error('Error fetching Brazil models:', error);
        return [];
    }
}

// Fetch Brazilian car price from FIPE API
async function fetchBrazilCarPrice(makeCode: string, modelCode: string): Promise<any> {
    try {
        // Get years for this model
        const yearsResponse = await fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${makeCode}/modelos/${modelCode}/anos`);
        const years = await yearsResponse.json();

        if (years.length > 0) {
            // Get price for latest year
            const latestYear = years[0];
            const priceResponse = await fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${makeCode}/modelos/${modelCode}/anos/${latestYear.codigo}`);
            return await priceResponse.json();
        }
        return null;
    } catch (error) {
        console.error('Error fetching Brazil car price:', error);
        return null;
    }
}

export const carsPlugin = new Elysia({ prefix: '/api/cars' })
    // Get supported countries
    .get('/countries', () => ({
        data: Object.entries(COUNTRIES).map(([code, info]) => ({
            code,
            ...info,
        })),
        timestamp: new Date().toISOString(),
    }))

    // Get car makes by country
    .get('/makes/:country', async ({ params: { country }, set }) => {
        const countryCode = country.toUpperCase() as CountryCode;

        if (!COUNTRIES[countryCode]) {
            set.status = 400;
            return { error: 'Invalid country code', validCodes: Object.keys(COUNTRIES) };
        }

        let makes: any[] = [];

        switch (countryCode) {
            case 'US':
                const usMakes = await fetchUSMakes();
                makes = usMakes.map(m => ({ id: m.Make_ID, name: m.Make_Name }));
                break;
            case 'BR':
                const brMakes = await fetchBrazilMakes();
                makes = brMakes.map(m => ({ id: m.codigo, name: m.nome }));
                break;
            case 'IN':
                // Get unique makes from static data
                const uniqueMakes = [...new Set(indianCars.map(c => c.make))];
                makes = uniqueMakes.map((name, idx) => ({ id: idx + 1, name }));
                break;
        }

        return {
            country: countryCode,
            countryInfo: COUNTRIES[countryCode],
            data: makes,
            count: makes.length,
            timestamp: new Date().toISOString(),
        };
    }, {
        params: t.Object({
            country: t.String(),
        }),
    })

    // Get cars by country (for suggestions)
    .get('/suggestions/:country', async ({ params: { country }, query, set }) => {
        const countryCode = country.toUpperCase() as CountryCode;
        const maxBudget = query.maxBudget ? parseFloat(query.maxBudget) : undefined;

        if (!COUNTRIES[countryCode]) {
            set.status = 400;
            return { error: 'Invalid country code', validCodes: Object.keys(COUNTRIES) };
        }

        const countryInfo = COUNTRIES[countryCode];
        let cars: any[] = [];

        switch (countryCode) {
            case 'IN':
                cars = indianCars.map(car => ({
                    ...car,
                    name: `${car.make} ${car.model}`,
                    emi: Math.round(car.price / 60), // Approximate 5-year EMI
                }));
                break;
            case 'US':
                // For US, we'll return popular cars with estimated prices
                cars = [
                    { id: 1, make: 'Toyota', model: 'Camry', year: 2024, price: 28000, fuelType: 'Petrol', bodyType: 'Sedan' },
                    { id: 2, make: 'Honda', model: 'Civic', year: 2024, price: 26000, fuelType: 'Petrol', bodyType: 'Sedan' },
                    { id: 3, make: 'Toyota', model: 'RAV4', year: 2024, price: 32000, fuelType: 'Petrol', bodyType: 'SUV' },
                    { id: 4, make: 'Honda', model: 'CR-V', year: 2024, price: 33000, fuelType: 'Petrol', bodyType: 'SUV' },
                    { id: 5, make: 'Ford', model: 'F-150', year: 2024, price: 38000, fuelType: 'Petrol', bodyType: 'Truck' },
                    { id: 6, make: 'Chevrolet', model: 'Silverado', year: 2024, price: 40000, fuelType: 'Petrol', bodyType: 'Truck' },
                    { id: 7, make: 'Tesla', model: 'Model 3', year: 2024, price: 42000, fuelType: 'Electric', bodyType: 'Sedan' },
                    { id: 8, make: 'Tesla', model: 'Model Y', year: 2024, price: 48000, fuelType: 'Electric', bodyType: 'SUV' },
                    { id: 9, make: 'Hyundai', model: 'Tucson', year: 2024, price: 30000, fuelType: 'Petrol', bodyType: 'SUV' },
                    { id: 10, make: 'Kia', model: 'Sportage', year: 2024, price: 31000, fuelType: 'Petrol', bodyType: 'SUV' },
                    { id: 11, make: 'Mazda', model: 'CX-5', year: 2024, price: 29000, fuelType: 'Petrol', bodyType: 'SUV' },
                    { id: 12, make: 'Subaru', model: 'Outback', year: 2024, price: 32000, fuelType: 'Petrol', bodyType: 'SUV' },
                    { id: 13, make: 'Honda', model: 'Accord', year: 2024, price: 30000, fuelType: 'Petrol', bodyType: 'Sedan' },
                    { id: 14, make: 'BMW', model: '3 Series', year: 2024, price: 48000, fuelType: 'Petrol', bodyType: 'Sedan' },
                    { id: 15, make: 'Mercedes-Benz', model: 'C-Class', year: 2024, price: 50000, fuelType: 'Petrol', bodyType: 'Sedan' },
                ].map(car => ({
                    ...car,
                    name: `${car.make} ${car.model}`,
                    emi: Math.round(car.price / 60),
                }));
                break;
            case 'BR':
                // For Brazil, return popular cars with estimated prices in BRL
                cars = [
                    { id: 1, make: 'Fiat', model: 'Argo', year: 2024, price: 85000, fuelType: 'Flex', bodyType: 'Hatchback' },
                    { id: 2, make: 'Volkswagen', model: 'Polo', year: 2024, price: 95000, fuelType: 'Flex', bodyType: 'Hatchback' },
                    { id: 3, make: 'Chevrolet', model: 'Onix', year: 2024, price: 88000, fuelType: 'Flex', bodyType: 'Hatchback' },
                    { id: 4, make: 'Hyundai', model: 'HB20', year: 2024, price: 92000, fuelType: 'Flex', bodyType: 'Hatchback' },
                    { id: 5, make: 'Toyota', model: 'Corolla', year: 2024, price: 150000, fuelType: 'Hybrid', bodyType: 'Sedan' },
                    { id: 6, make: 'Honda', model: 'Civic', year: 2024, price: 165000, fuelType: 'Flex', bodyType: 'Sedan' },
                    { id: 7, make: 'Jeep', model: 'Renegade', year: 2024, price: 130000, fuelType: 'Flex', bodyType: 'SUV' },
                    { id: 8, make: 'Jeep', model: 'Compass', year: 2024, price: 180000, fuelType: 'Flex', bodyType: 'SUV' },
                    { id: 9, make: 'Volkswagen', model: 'T-Cross', year: 2024, price: 125000, fuelType: 'Flex', bodyType: 'SUV' },
                    { id: 10, make: 'Fiat', model: 'Pulse', year: 2024, price: 95000, fuelType: 'Flex', bodyType: 'SUV' },
                    { id: 11, make: 'Chevrolet', model: 'Tracker', year: 2024, price: 120000, fuelType: 'Flex', bodyType: 'SUV' },
                    { id: 12, make: 'Toyota', model: 'Hilux', year: 2024, price: 250000, fuelType: 'Diesel', bodyType: 'Truck' },
                ].map(car => ({
                    ...car,
                    name: `${car.make} ${car.model}`,
                    emi: Math.round(car.price / 60),
                }));
                break;
        }

        // Filter by budget if provided
        if (maxBudget) {
            cars = cars.filter(car => car.price <= maxBudget);
        }

        return {
            country: countryCode,
            countryInfo,
            data: cars,
            count: cars.length,
            timestamp: new Date().toISOString(),
        };
    }, {
        params: t.Object({
            country: t.String(),
        }),
        query: t.Object({
            maxBudget: t.Optional(t.String()),
        }),
    })

    // Get all cars (legacy endpoint)
    .get('/', () => ({
        data: indianCars,
        count: indianCars.length,
        timestamp: new Date().toISOString(),
    }))

    // Get car by ID
    .get('/:id', ({ params: { id }, set }) => {
        const carId = parseInt(id);
        const car = indianCars.find(c => c.id === carId);

        if (!car) {
            set.status = 404;
            return {
                error: 'Car not found',
                id: carId,
            };
        }

        return {
            data: car,
            timestamp: new Date().toISOString(),
        };
    }, {
        params: t.Object({
            id: t.String(),
        }),
    });
