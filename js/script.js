document.addEventListener('DOMContentLoaded', () => {
    const decryptBtn = document.getElementById('decryptBtn');
    const decryptedTextPre = document.getElementById('decryptedText');
    const mappingTableBody = document.querySelector('#mappingTable tbody');

    // Frecuencia de letras en inglés (orden de mayor a menor)
    const englishFrequency = ['E', 'T', 'A', 'O', 'I', 'N', 'S', 'H', 'R', 'D', 'L', 'C', 'U', 'M', 'W', 'F', 'G', 'Y', 'P', 'B', 'V', 'K', 'J', 'X', 'Q', 'Z'];

    // Función para calcular frecuencia de letras en el texto
    const calculateFrequency = (text) => {
        const freq = {};
        for (let char of text) {
            if (/[A-Z]/.test(char)) {
                freq[char] = (freq[char] || 0) + 1;
            }
        }
        // Convert to array of [letter, count] and sort descending
        return Object.entries(freq).sort((a, b) => b[1] - a[1]).map(item => item[0]);
    };

    // Función para encontrar todas las posibles posiciones donde la palabra clave puede encajar
    const findPossibleMappings = (cipherText, clueWord) => {
        const positions = [];
        const cipherTextUpper = cipherText.toUpperCase();
        const clueUpper = clueWord.toUpperCase();
        const clueLength = clueUpper.length;

        for (let i = 0; i <= cipherTextUpper.length - clueLength; i++) {
            const segment = cipherTextUpper.substring(i, i + clueLength);
            if (/^[A-Z]+$/.test(segment)) { // Solo letras
                let possible = true;
                const tempMap = {};
                for (let j = 0; j < clueLength; j++) {
                    const cipherChar = segment[j];
                    const plainChar = clueUpper[j];
                    if (tempMap[cipherChar] && tempMap[cipherChar] !== plainChar) {
                        possible = false;
                        break;
                    }
                    tempMap[cipherChar] = plainChar;
                }
                if (possible) {
                    positions.push({ index: i, mapping: tempMap });
                }
            }
        }
        return positions;
    };

    // Función para aplicar mapping y retornar el texto descifrado
    const applyMapping = (cipherText, mapping) => {
        let decrypted = '';
        for (let char of cipherText.toUpperCase()) {
            if (/[A-Z]/.test(char)) {
                decrypted += mapping[char] ? mapping[char] : '_';
            } else {
                decrypted += char;
            }
        }
        return decrypted;
    };

    // Función para fusionar dos mappings
    const mergeMappings = (map1, map2) => {
        const merged = { ...map1 };
        for (let key in map2) {
            if (merged[key] && merged[key] !== map2[key]) {
                return null; // Conflicto
            }
            merged[key] = map2[key];
        }
        return merged;
    };

    // Función para realizar análisis de frecuencia y completar el mapping
    const completeMapping = (partialMap, cipherText) => {
        // Determinar qué letras ya están mapeadas
        const mappedPlain = new Set(Object.values(partialMap));
        const mappedCipher = Object.keys(partialMap); // Cambiado de Set a Array

        // Calcular frecuencia de las letras cifradas restantes
        const regex = new RegExp(`[${mappedCipher.join('')}]`, 'g'); // Ahora mappedCipher es un arreglo
        const remainingCipherText = cipherText.toUpperCase().replace(regex, '');
        const remainingCipher = calculateFrequency(remainingCipherText);

        // Asignar letras cifradas restantes a las letras más frecuentes en inglés no mapeadas
        let freqIndex = 0;
        for (let cipherChar of remainingCipher) {
            while (freqIndex < englishFrequency.length && mappedPlain.has(englishFrequency[freqIndex])) {
                freqIndex++;
            }
            if (freqIndex < englishFrequency.length) {
                partialMap[cipherChar] = englishFrequency[freqIndex];
                mappedPlain.add(englishFrequency[freqIndex]);
                freqIndex++;
            } else {
                partialMap[cipherChar] = '_'; // No se pudo determinar
            }
        }
        return partialMap;
    };

    decryptBtn.addEventListener('click', () => {
        const cipherText = document.getElementById('cipherText').value;
        const clueWord = document.getElementById('clueWord').value.trim();

        if (!cipherText || !clueWord) {
            alert('Por favor, ingresa tanto el mensaje cifrado como la palabra clave.');
            return;
        }

        const clueUpper = clueWord.toUpperCase();

        // Encontrar todas las posibles mappings basadas en la palabra clave
        const possibleMappings = findPossibleMappings(cipherText, clueWord);

        if (possibleMappings.length === 0) {
            alert('No se encontraron posibles mappings con la palabra clave proporcionada.');
            return;
        }

        let successfulDecryption = false;

        for (let mappingObj of possibleMappings) {
            // Fusionar mapping parcial con análisis de frecuencia
            let completeMap = { ...mappingObj.mapping };
            completeMap = completeMapping(completeMap, cipherText);

            // Aplicar el mapping completo
            const decrypted = applyMapping(cipherText, completeMap);

            // Heurística simple: contar palabras reconocibles (por ejemplo, palabras con longitud >3)
            const words = decrypted.split(/\s+/);
            let recognizable = 0;
            for (let word of words) {
                if (word.length > 3 && !word.includes('_')) { // Mejorada la condición
                    recognizable++;
                }
            }

            // Si se cumple un cierto umbral de palabras reconocibles, considerarlo exitoso
            if (recognizable > 5) { // El umbral puede ajustarse
                decryptedTextPre.textContent = decrypted;
                // Actualizar la tabla de mapeo
                mappingTableBody.innerHTML = '';
                for (let [cipher, plain] of Object.entries(completeMap)) {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${cipher}</td>
                        <td>${plain}</td>
                    `;
                    mappingTableBody.appendChild(row);
                }
                successfulDecryption = true;
                break;
            }
        }

        if (!successfulDecryption) {
            // Si ningún mapping cumple el umbral, mostrar el primer mapping posible
            const mappingObj = possibleMappings[0];
            let completeMap = { ...mappingObj.mapping };
            completeMap = completeMapping(completeMap, cipherText);
            const decrypted = applyMapping(cipherText, completeMap);
            decryptedTextPre.textContent = decrypted;

            // Actualizar la tabla de mapeo
            mappingTableBody.innerHTML = '';
            for (let [cipher, plain] of Object.entries(completeMap)) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${cipher}</td>
                    <td>${plain}</td>
                `;
                mappingTableBody.appendChild(row);
            }
            alert('Se intentó el descifrado con el primer mapping posible basado en la palabra clave.');
        }
    });
});
