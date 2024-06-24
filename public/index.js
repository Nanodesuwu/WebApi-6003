
document.addEventListener('DOMContentLoaded', async function () {
    // Fetch Pokémon data or use a static array of Pokémon for demonstration
    const pokemonData = [
        { name: 'Bulbasaur', imageUrl: '', typing: 'Grass, Poison', totalBaseStats: 318 },
        { name: 'Charmander', imageUrl: '', typing: 'Fire', totalBaseStats: 309 },
        { name: 'Squirtle', imageUrl: '', typing: 'Water', totalBaseStats: 314 }
        // Add more Pokémon as needed
    ];

    const pokemonListDiv = document.getElementById('pokemon-list');
    
    // Populate Pokémon list
    pokemonData.forEach(pokemon => {
        const pokemonLink = document.createElement('a');
        pokemonLink.href = `details.html?pokemonName=${encodeURIComponent(pokemon.name)}&imageUrl=${encodeURIComponent(pokemon.imageUrl)}&typing=${encodeURIComponent(pokemon.typing)}&totalBaseStats=${pokemon.totalBaseStats}`;
        pokemonLink.textContent = pokemon.name;
        pokemonLink.classList.add('pokemon-link');
        pokemonLink.addEventListener('click', async (event) => {
            event.preventDefault(); // Prevent default link behavior

            await savePokemonDetailsToHistory(pokemon);

            // Navigate to details.html after saving to history
            window.location.href = pokemonLink.href;
        });

        const pokemonItemDiv = document.createElement('div');
        pokemonItemDiv.classList.add('pokemon-item');
        pokemonItemDiv.appendChild(pokemonLink);
        pokemonListDiv.appendChild(pokemonItemDiv);
    });
});

async function savePokemonDetailsToHistory(pokemonDetails) {
    try {
        const response = await fetch('/saveHistory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pokemonDetails)
        });

        if (!response.ok) {
            throw new Error('Failed to save Pokémon details to history');
        }

        const result = await response.text();
        console.log(result); // Should log 'Pokémon details saved to history' if successful
    } catch (error) {
        console.error('Error saving Pokémon details:', error.message);
    }
}

function goBack() {
    document.getElementById('pokemon-details-page').classList.add('hidden');
    document.getElementById('pokemon-list-page').classList.remove('hidden');
}
