document.addEventListener('DOMContentLoaded', () => {
    const allPokemon = [];

    async function fetchPokemonList() {
        try {
            const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=300'); // Adjust the limit as needed
            const data = await response.json();
            allPokemon.push(...data.results.map(pokemon => ({
                name: pokemon.name,
                url: pokemon.url
            })));
            // Sort the pokemon array based on id
            allPokemon.sort((a, b) => getPokemonId(a.url) - getPokemonId(b.url));
            displayPokemonList(allPokemon)
        } catch (error) {
            console.error('Error fetching Pokémon list:', error);
        }
    }

    async function displayPokemonList(pokemonList) {
        const list = document.getElementById('pokemon-list');
        list.innerHTML = '';
    
        // Sort pokemonList based on their id
        pokemonList.sort((a, b) => getPokemonId(a.url) - getPokemonId(b.url));
    
        for (const pokemon of pokemonList) {
            try {
                const response = await fetch(pokemon.url);
                const data = await response.json();
                const div = document.createElement('div');
                div.className = 'pokemon-item';
    
                // Extract Pokémon ID directly from the fetched data
                const pokemonId = data.id;
    
                // Simple type to color mapping (you can adjust colors as needed)
                const typeColors = {
                    normal: '#A8A878',
                    fire: '#F08030',
                    water: '#6890F0',
                    electric: '#F8D030',
                    grass: '#78C850',
                    ice: '#98D8D8',
                    fighting: '#C03028',
                    poison: '#A040A0',
                    ground: '#E0C068',
                    flying: '#A890F0',
                    psychic: '#F85888',
                    bug: '#A8B820',
                    rock: '#B8A038',
                    ghost: '#705898',
                    dragon: '#7038F8',
                    dark: '#705848',
                    steel: '#B8B8D0',
                    fairy: '#EE99AC'
                };
    
                const types = data.types.map(typeInfo => ({
                    name: typeInfo.type.name,
                    color: typeColors[typeInfo.type.name] || '#A8A878' // Default to a neutral color if type color not found
                }));
    
                div.innerHTML = `
                    <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png" alt="${data.name}">
                    <p>#${pokemonId}</p>
                    <a href="details.html?name=${data.name}" class="pokemon-name">${data.name}</a>
                    <div class="pokemon-types">
                        ${types.map(type => `<span class="type" style="color: ${type.color};">${type.name}</span>`).join('')}
                    </div>
                `;
                list.appendChild(div);
    
                // Add click event listener to the Pokémon name link (only once)
                const pokemonNameLink = div.querySelector('.pokemon-name');
                pokemonNameLink.addEventListener('click', async (event) => {
                    event.preventDefault(); // Prevent the default link behavior
                    try {
                        const pokemonName = event.target.textContent;
                        console.log(`Clicked on ${pokemonName}`); // Debugging check
                        await fetchAndDisplayPokemonDetails(pokemonName);
    
                        // Navigate to details.html after fetching details
                        window.location.href = `details.html?name=${pokemonName}`;
                    } catch (error) {
                        console.error('Error fetching and displaying Pokémon details:', error);
                    }
    
                });
            } catch (error) {
                console.error('Error displaying Pokémon details:', error);
            }
        }
    }
    

    async function fetchAndDisplayPokemonDetails(name) {
        try {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
            const data = await response.json();
            const speciesResponse = await fetch(data.species.url);
            const speciesData = await speciesResponse.json();
            const evolutionChainResponse = await fetch(speciesData.evolution_chain.url);
            const evolutionChainData = await evolutionChainResponse.json();
            const weaknesses = await fetchWeaknesses(data.types);
            const moves = await fetchMoveDetails(data.moves);
            displayPokemonDetails(data, speciesData, weaknesses, moves, evolutionChainData);

            // Save Pokémon details to history
            await savePokemonDetailsToHistory({
                pokemonName: data.name,
                imageUrl: data.sprites.front_default,
                typing: data.types.map(typeInfo => typeInfo.type.name).join(', '),
                totalBaseStats: data.stats.reduce((acc, stat) => acc + stat.base_stat, 0)
                
            });
            console.log(`Fetching details for ${name}`);
        } catch (error) {
            console.error('Error fetching Pokémon details:', error);
        }
    }

    async function fetchWeaknesses(types) {
        try {
            const typeUrls = types.map(typeInfo => typeInfo.type.url);
            const typeData = await Promise.all(typeUrls.map(url => fetch(url).then(res => res.json())));
            const damageRelations = typeData.map(type => type.damage_relations);
            const weaknesses = new Set();

            damageRelations.forEach(relation => {
                relation.double_damage_from.forEach(type => weaknesses.add(type.name));
            });

            return Array.from(weaknesses);
        } catch (error) {
            console.error('Error fetching weaknesses:', error);
            return [];
        }
    }

    async function fetchMoveDetails(moves) {
        try {
            const moveDetails = await Promise.all(moves.map(async move => {
                try {
                    const moveData = await fetch(move.move.url).then(res => res.json());
                    const levelDetail = move.version_group_details.find(detail => detail.move_learn_method.name === 'level-up');
    
                    return {
                        name: moveData.name,
                        type: moveData.type.name,
                        power: moveData.power,
                        accuracy: moveData.accuracy,
                        category: moveData.damage_class.name,
                        level: levelDetail ? levelDetail.level_learned_at : null
                    };
                } catch (error) {
                    console.error(`Error fetching details for move ${move.move.name}:`, error);
                    return null; // Return null or handle error gracefully
                }
            }));
    
            return moveDetails.filter(move => move !== null);
        } catch (error) {
            console.error('Error fetching move details:', error);
            return [];
        }
    }
    document.getElementById('search').addEventListener('input', (event) => {
        const searchTerm = event.target.value.toLowerCase();
        const filteredPokemon = allPokemon.filter(pokemon => pokemon.name.toLowerCase().includes(searchTerm));
        displayPokemonList(filteredPokemon);
    });
    

    async function generateEvolutionLine(chain) {
        let evolutionLineHTML = '';
        let current = chain;
        const evolutionSteps = [];

        while (current) {
            const imageSrc = await fetchPokemonImage(current.species.name); // Fetch image
            evolutionSteps.push({ name: current.species.name, image: imageSrc });
            current = current.evolves_to[0];
        }

        evolutionSteps.forEach((step, index) => {
            evolutionLineHTML += `
                <div class="evolution-step">
                    <a href="#" onclick="fetchPokemonByName('${step.name}'); return false;">
                        <img src="${step.image}" alt="${step.name}">
                    </a>
                    <p>${step.name}</p>
                </div>
            `;
            if (index < evolutionSteps.length - 1) {
                evolutionLineHTML += `<div class="arrow">→</div>`;
            }
        });

        return `<div class="evolution-line">${evolutionLineHTML}</div>`;
    }

    async function displayPokemonDetails(pokemon, species, weaknesses, moves, evolutionChain) {
        const details = document.getElementById('pokemon-details');
        details.classList.remove('hidden');

        const evolutionLineHTML = await generateEvolutionLine(evolutionChain.chain);

        moves.sort((a, b) => a.level - b.level);

        const baseStatsGraph = pokemon.stats.map(stat => {
            const statPercentage = (stat.base_stat / 255) * 100;
            return `
                <div class="stat-bar">
                    <div class="stat-label">${stat.stat.name}</div>
                    <div class="stat-value">${stat.base_stat}</div>
                    <div class="stat-fill" style="width: ${statPercentage}%;"></div>
                </div>
            `;
        }).join('');

        const totalBaseStats = pokemon.stats.reduce((acc, stat) => acc + stat.base_stat, 0);

        details.innerHTML = `
            <h2>${pokemon.name}</h2>
            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png" alt="${pokemon.name}">
            <p>#${pokemon.id}</p>
            <p>Type: ${pokemon.types.map(typeInfo => typeInfo.type.name).join(', ')}</p>
            <p>Weaknesses: ${weaknesses.join(', ')}</p>

            <div class="data-section">
                <h3>Pokédex Data</h3>
                <div class="data-item">National №: ${species.id}</div>
                <div class="data-item">Type: ${pokemon.types.map(typeInfo => typeInfo.type.name).join(', ')}</div>
                <div class="data-item">Species: ${species.genera.find(genus => genus.language.name === 'en').genus}</div>
                <div class="data-item">Abilities: ${pokemon.abilities.map(ability => `${ability.ability.name} ${ability.is_hidden ? '(Hidden Ability)' : ''}`).join(', ')}</div>
            </div>

            <div class="data-section">
                <h3>Training</h3>
                <div class="data-item">EV yield: ${pokemon.stats[2].base_stat}</div>
                <div class="data-item">Catch rate: 45 (5.9% with PokéBall, full HP)</div>
                <div class="data-item">Base Friendship: 50 (normal)</div>
               <div class="data-item">Base Exp.: 64</div>
                <div class="data-item">Growth Rate: Medium Slow</div>
            </div>

            <div class="data-section">
                <h3>Base Stats</h3>
                ${baseStatsGraph}
                <div class="total-base-stats">Total Base Stats: ${totalBaseStats}</div>
            </div>

            <h3>Evolution Line</h3>
            <div class="evolution-line">
                ${evolutionLineHTML}
            </div>

            <h3>Moves by Leveling Up</h3>
            <table>
                <tr>
                    <th>Level</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Power</th>
                    <th>Accuracy</th>
                </tr>
                ${moves.map(move => `
                    <tr>
                        <td>${move.level}</td>
                        <td>${move.name}</td>
                        <td>${move.type}</td>
                        <td>${move.category}</td>
                        <td>${move.power}</td>
                        <td>${move.accuracy}</td>
                    </tr>
                `).join('')}
            </table>
        `;

        // Scroll to top of details section after rendering
        details.scrollIntoView({ behavior: 'smooth' });
    }

    async function fetchPokemonImage(name) {
        try {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
            const data = await response.json();
            return data.sprites.front_default;
        } catch (error) {
            console.error('Error fetching Pokémon image:', error);
            return '';
        }
    }

    async function savePokemonDetailsToHistory(pokemonDetails) {
        try {
            const response = await fetch('/saveHistory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(pokemonDetails)
            });
            if (response.ok) {
                console.log('Pokémon details saved to history');
            } else {
                throw new Error('Failed to save Pokémon details to history');
            }
        } catch (error) {
            console.error('Error saving Pokémon details to history:', error);
        }
    }

    function getPokemonId(url) {
        const idRegex = /\/(\d+)\//;
        const match = url.match(idRegex);
        return match ? match[1] : 'Unknown';
    }

    fetchPokemonList();
});

function goBack() {
    window.history.back();
}