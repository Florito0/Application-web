// kiosk-validation.js - Validation anti-fraude pour Interface 2
// Ce fichier doit être chargé AVANT gestion-entrees.js

/**
 * Valide le panier kiosque avant de passer à l'interface suivante
 * Vérifie que le nombre d'entrées >= nombre de personnes déclarées
 */
function validateKioskOrder() {
    console.log('🔒 [Kiosk-Validation] Démarrage validation anti-fraude');
    
    // Récupérer le nombre de personnes déclarées (Interface 1)
    const nombrePersonnes = parseInt(localStorage.getItem('kioskGroupSize')) || 1;
    console.log(`👥 [Kiosk-Validation] Personnes déclarées: ${nombrePersonnes}`);
    
    // Récupérer le panier actuel depuis gestion-entrees
    const gestionEntreesInstance = window.getGestionEntreesInstance();
    if (!gestionEntreesInstance) {
        console.error('❌ [Kiosk-Validation] Instance GestionEntrees introuvable');
        return false;
    }
    
    // Calculer le nombre total d'entrées dans le panier
    let totalEntrees = 0;
    const panierData = {
        items: [],
        total: 0,
        totalEntrees: 0
    };
    
    // Parcourir le panier pour compter les entrées
    if (gestionEntreesInstance.cart && Array.isArray(gestionEntreesInstance.cart)) {
        gestionEntreesInstance.cart.forEach(item => {
            // Vérifier si c'est une entrée (pas une bouteille)
            if (item.type === 'entree' || !item.type) {
                totalEntrees += item.quantity || 0;
            }
            
            panierData.items.push({
                id: item.id,
                nom: item.nom,
                type: item.type || 'entree',
                quantity: item.quantity || 0,
                prix: item.prix || 0
            });
            
            panierData.total += (item.prix || 0) * (item.quantity || 0);
        });
    }
    
    panierData.totalEntrees = totalEntrees;
    
    console.log(`🎫 [Kiosk-Validation] Entrées sélectionnées: ${totalEntrees}`);
    console.log(`💰 [Kiosk-Validation] Total panier:`, panierData);
    
    // 🚨 RÈGLE ANTI-FRAUDE : Nombre d'entrées DOIT être >= Nombre de personnes
    if (totalEntrees < nombrePersonnes) {
        console.warn(`❌ [Kiosk-Validation] BLOQUÉ: ${totalEntrees} entrées < ${nombrePersonnes} personnes`);
        
        // Émettre un événement de validation échouée
        document.dispatchEvent(new CustomEvent('validateKioskOrder', {
            detail: {
                success: false,
                totalEntrees: totalEntrees,
                nombrePersonnes: nombrePersonnes,
                error: 'INSUFFICIENT_ENTRIES'
            }
        }));
        
        return false;
    }
    
    // ✅ VALIDATION OK
    console.log(`✅ [Kiosk-Validation] Validation OK - Passage à Interface 3`);
    
    // Émettre un événement de validation réussie avec les données du panier
    document.dispatchEvent(new CustomEvent('validateKioskOrder', {
        detail: {
            success: true,
            totalEntrees: totalEntrees,
            nombrePersonnes: nombrePersonnes,
            ...panierData
        }
    }));
    
    return true;
}

/**
 * Obtenir le texte du bouton de validation avec le nombre de personnes
 */
function getKioskValidationButtonText() {
    const nombrePersonnes = parseInt(localStorage.getItem('kioskGroupSize')) || 1;
    const personneText = nombrePersonnes === 1 ? 'PERSONNE' : 'PERSONNES';
    return `VALIDER POUR ${nombrePersonnes} ${personneText}`;
}

/**
 * Mettre à jour le bouton de validation dans l'interface kiosque
 */
function updateKioskValidationButton() {
    const validateBtn = document.getElementById('validate-kiosk-btn');
    if (validateBtn) {
        validateBtn.textContent = getKioskValidationButtonText();
    }
}

// Exposer les fonctions globalement
window.validateKioskOrder = validateKioskOrder;
window.getKioskValidationButtonText = getKioskValidationButtonText;
window.updateKioskValidationButton = updateKioskValidationButton;

// Mettre à jour le bouton au chargement
document.addEventListener('DOMContentLoaded', () => {
    console.log('📍 [Kiosk-Validation] Script chargé');
    updateKioskValidationButton();
});

// Mettre à jour le bouton quand le nombre de personnes change
document.addEventListener('kioskToViewTransition', () => {
    console.log('🔄 [Kiosk-Validation] Mise à jour bouton validation');
    updateKioskValidationButton();
});
