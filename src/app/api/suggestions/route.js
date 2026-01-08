import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { connectToDatabase } from '@/lib/mongodb';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { db } = await connectToDatabase();
        
        // Get all suggestions grouped by type
        const suggestions = await db.collection('suggestions').find({}).toArray();
        
        // Group suggestions by type
        const groupedSuggestions = {
            species: [],
            subspecies: [],
            colors: [],
            locales: [],
            cuts: [],        // Geometric cuts (Round, Princess, etc.)
            cutStyles: [],   // Cutting techniques (Brilliant, Fantasy, etc.)
            treatments: []
        };
        
        suggestions.forEach(suggestion => {
            if (groupedSuggestions[suggestion.type]) {
                groupedSuggestions[suggestion.type].push(suggestion.value);
            }
        });
        
        // Sort each array
        Object.keys(groupedSuggestions).forEach(key => {
            groupedSuggestions[key].sort();
        });

        return NextResponse.json(groupedSuggestions);
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { type, value } = await request.json();
        
        if (!type || !value) {
            return NextResponse.json({ error: 'Type and value are required' }, { status: 400 });
        }

        const validTypes = ['species', 'subspecies', 'colors', 'locales', 'cuts', 'cutStyles', 'treatments'];
        if (!validTypes.includes(type)) {
            return NextResponse.json({ error: 'Invalid suggestion type' }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        
        // Check if suggestion already exists
        const existingSuggestion = await db.collection('suggestions').findOne({ 
            type, 
            value: { $regex: new RegExp(`^${value}$`, 'i') } // Case-insensitive exact match
        });
        
        if (existingSuggestion) {
            return NextResponse.json({ message: 'Suggestion already exists' });
        }
        
        // Add new suggestion
        await db.collection('suggestions').insertOne({
            type,
            value,
            createdBy: session.user.email || session.user.name,
            createdAt: new Date()
        });

        return NextResponse.json({ message: 'Suggestion saved successfully' });
    } catch (error) {
        console.error('Error saving suggestion:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}