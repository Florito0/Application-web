// public/js/kiosk-workflow.js - Gestion du workflow Interface 1: Nombre de personnes
// VERSION CORRIGÉE - 10 novembre 2024

(function() {  // IIFE pour scoper localement et éviter les conflits globaux
    class KioskWorkflow {
        constructor() {
            this.token = localStorage.getItem('token');
            this.apiBaseUrl = '/api/kiosk';
            this.capaciteApiUrl = '/api/capacite';
            
            // État de l'interface
            this.groupSize = 1; // Valeur initiale minimum
            this.minGroupSize = 1;
            this.maxGroupSize = 40;
            this.capacityRemaining = null;
            this.capacityThreshold = 20; // Seuil pour afficher l'alerte
            this.capacityLoadFailed = false; // Flag pour indiquer si le chargement a échoué
            
            // Éléments DOM
            this.interface1 = null;
            this.qtyValue = null;
            this.decreaseBtn = null;
            this.increaseBtn = null;
            this.validateBtn = null;
            this.capacityAlert = null;
            this.maxMessage = null;
            this.headerTitle = null;
            this.headerDate = null;

            // Polling pour capacité
            this.capacityInterval = null;
        }

        // Initialisation de l'interface
        async init() {
            console.log('🚀 [KioskWorkflow] Initialisation Interface 1');
            
            // Récupérer les éléments DOM
            this.interface1 = document.getElementById('kiosk-interface-1');
            if (!this.interface1) {
                console.error('❌ [KioskWorkflow] Interface 1 introuvable');
                return;
            }

            this.qtyValue = document.getElementById('kiosk-interface-1-qty-value');
            this.decreaseBtn = document.getElementById('kiosk-interface-1-decrease');
            this.increaseBtn = document.getElementById('kiosk-interface-1-increase');
            this.validateBtn = document.getElementById('kiosk-interface-1-validate');
            this.capacityAlert = document.getElementById('kiosk-interface-1-capacity-alert');
            this.maxMessage = document.getElementById('kiosk-interface-1-max-message');
            this.headerTitle = document.getElementById('kiosk-interface-1-title');
            this.headerDate = document.getElementById('kiosk-interface-1-date');

            // Charger le nom de la discothèque et la date
            await this.loadHeader();

            // Charger la capacité disponible
            await this.loadCapacity();

            // Attacher les événements
            this.attachEvents();

            // Mise à jour initiale de l'affichage
            this.updateDisplay();

            // Démarrer le polling pour la capacité
            if (this.capacityInterval) {
                clearInterval(this.capacityInterval);
            }
            this.capacityInterval = setInterval(() => this.loadCapacity(), 10000);

            console.log('✅ [KioskWorkflow] Interface 1 initialisée');
        }

        // Charger le nom de la discothèque et la date
        async loadHeader() {
            try {
                const discoName = await this.getDiscoName();
                const formattedDate = this.getFormattedDate();

                if (this.headerTitle) {
                    this.headerTitle.textContent = discoName;
                }

                if (this.headerDate) {
                    this.headerDate.textContent = formattedDate;
                }
            } catch (error) {
                console.error('❌ [KioskWorkflow] Erreur chargement header:', error);
            }
        }

        // Récupérer le nom de la discothèque
        async getDiscoName() {
            if (!this.token) {
                console.warn('⚠️ [KioskWorkflow] Pas de token – fallback nom');
                return 'Bienvenue au Kiosque';
            }
            try {
                const response = await fetch('/api/profile', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    return data.discoName || 'Bienvenue au Kiosque';
                }
            } catch (error) {
                console.error('❌ [KioskWorkflow] Erreur récupération nom:', error);
            }
            return 'Bienvenue au Kiosque';
        }

        // Formater la date du jour
        getFormattedDate() {
            const today = new Date();
            const daysOfWeek = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
            const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
            
            const dayName = daysOfWeek[today.getDay()];
            const day = today.getDate();
            const month = months[today.getMonth()];
            const year = today.getFullYear();
            
            return `${dayName} ${day} ${month} ${year}`;
        }

        // Charger la capacité disponible (polling)
        async loadCapacity() {
            if (!this.token) {
                console.warn('⚠️ [KioskWorkflow] Pas de token – skip capacité');
                return;
            }
            try {
                const response = await fetch(this.capaciteApiUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data && data.length > 0) {
                        const capaciteData = data[0];
                        const max = capaciteData.max || 400;
                        const current = capaciteData.current || 0;
                        this.capacityRemaining = max - current;
                        this.capacityLoadFailed = false; // Réinitialiser le flag d'erreur

                        console.log(`📊 [KioskWorkflow] Capacité restante: ${this.capacityRemaining}/${max}`);

                        // Mettre à jour l'affichage des alertes
                        this.updateCapacityAlerts();
                        
                        // Réactiver le bouton de validation si nécessaire
                        if (this.validateBtn && this.validateBtn.disabled && this.capacityRemaining > 0) {
                            this.validateBtn.disabled = false;
                            this.updateDisplay(); // Mettre à jour le texte du bouton
                        }
                    } else {
                        console.warn('⚠️ [KioskWorkflow] Données de capacité vides');
                        this.handleCapacityLoadError();
                    }
                } else {
                    console.error('❌ [KioskWorkflow] Erreur API capacité:', response.status);
                    this.handleCapacityLoadError();
                }
            } catch (error) {
                console.error('❌ [KioskWorkflow] Erreur chargement capacité:', error);
                this.handleCapacityLoadError();
            }
        }

        // Gérer les erreurs de chargement de capacité
        handleCapacityLoadError() {
            this.capacityLoadFailed = true;
            
            // Bloquer la validation si capacité inconnue
            if (this.validateBtn) {
                this.validateBtn.disabled = true;
                this.validateBtn.textContent = '⚠️ CAPACITÉ INDISPONIBLE';
            }

            // Afficher une alerte avec bouton retry
            if (this.capacityAlert) {
                this.capacityAlert.classList.add('visible');
                const alertText = this.capacityAlert.querySelector('.alert-text');
                if (alertText) {
                    alertText.innerHTML = `
                        ⚠️ Impossible de récupérer la capacité - Veuillez réessayer
                        <button class="capacity-retry-btn" style="
                            display: block;
                            margin: 15px auto 0;
                            background: #007bff;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 8px;
                            font-size: 16px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: background 0.3s ease;
                        ">🔄 RÉESSAYER</button>
                    `;
                    
                    // Attacher l'événement au bouton retry
                    const retryBtn = alertText.querySelector('.capacity-retry-btn');
                    if (retryBtn) {
                        retryBtn.addEventListener('click', () => {
                            console.log('🔄 [KioskWorkflow] Retry manuel capacité');
                            this.capacityLoadFailed = false;
                            this.capacityAlert.classList.remove('visible');
                            this.loadCapacity();
                        });
                        
                        // Effet hover
                        retryBtn.addEventListener('mouseenter', function() {
                            this.style.background = '#0056b3';
                        });
                        retryBtn.addEventListener('mouseleave', function() {
                            this.style.background = '#007bff';
                        });
                    }
                }
            }
        }

        // Mettre à jour les alertes de capacité
        updateCapacityAlerts() {
            // Ne pas afficher d'alerte si le chargement a échoué
            if (this.capacityLoadFailed) {
                return;
            }

            // Afficher l'alerte "Presque complet" si <20 places
            if (this.capacityAlert) {
                if (this.capacityRemaining !== null && this.capacityRemaining < this.capacityThreshold && this.capacityRemaining > 0) {
                    this.capacityAlert.classList.add('visible');
                    const alertText = this.capacityAlert.querySelector('.alert-text');
                    if (alertText) {
                        alertText.textContent = `⚠️ Presque complet - Plus que ${this.capacityRemaining} places disponibles`;
                    }
                } else if (this.capacityRemaining === 0) {
                    this.capacityAlert.classList.add('visible');
                    const alertText = this.capacityAlert.querySelector('.alert-text');
                    if (alertText) {
                        alertText.textContent = '🚫 Complet - Aucune place disponible';
                    }
                } else {
                    this.capacityAlert.classList.remove('visible');
                }
            }

            // Bloquer si la capacité est dépassée
            if (this.capacityRemaining !== null && this.groupSize > this.capacityRemaining) {
                this.groupSize = Math.max(this.minGroupSize, this.capacityRemaining);
                this.updateDisplay();
            }
        }

        // Attacher les événements
        attachEvents() {
            // Bouton - (diminuer)
            if (this.decreaseBtn) {
                this.decreaseBtn.addEventListener('click', () => this.changeGroupSize(-1));
            }

            // Bouton + (augmenter)
            if (this.increaseBtn) {
                this.increaseBtn.addEventListener('click', () => this.changeGroupSize(1));
            }

            // Bouton VALIDER - CORRECTION DU BUG CRITIQUE
            if (this.validateBtn) {
                this.validateBtn.addEventListener('click', () => this.validateGroupSize());
            }
        }

        // Changer la taille du groupe
        changeGroupSize(change) {
            const newSize = this.groupSize + change;

            // Vérifier les limites
            if (newSize < this.minGroupSize) return;
            if (newSize > this.maxGroupSize) return;

            // Vérifier la capacité disponible
            if (this.capacityRemaining !== null && newSize > this.capacityRemaining) {
                // Bloquer immédiatement si dépasse la capacité
                console.warn(`⚠️ [KioskWorkflow] Capacité insuffisante: ${newSize} > ${this.capacityRemaining}`);
                return;
            }

            this.groupSize = newSize;
            this.updateDisplay();
        }

        // Mettre à jour l'affichage
        updateDisplay() {
            // Mettre à jour la valeur affichée
            if (this.qtyValue) {
                this.qtyValue.textContent = this.groupSize;
            }

            // Mettre à jour l'état des boutons
            if (this.decreaseBtn) {
                this.decreaseBtn.disabled = this.groupSize <= this.minGroupSize;
            }

            if (this.increaseBtn) {
                // Bloquer le bouton + si on atteint 40 OU la capacité restante
                const maxAllowed = this.capacityRemaining !== null 
                    ? Math.min(this.maxGroupSize, this.capacityRemaining) 
                    : this.maxGroupSize;
                
                this.increaseBtn.disabled = this.groupSize >= maxAllowed;
            }

            // Mettre à jour le texte du bouton VALIDER
            if (this.validateBtn && !this.capacityLoadFailed) {
                const personText = this.groupSize === 1 ? 'PERSONNE' : 'PERSONNES';
                this.validateBtn.textContent = `VALIDER POUR ${this.groupSize} ${personText}`;
            }

            // Afficher le message "Maximum 40 personnes" uniquement à 40
            if (this.maxMessage) {
                if (this.groupSize === this.maxGroupSize) {
                    this.maxMessage.classList.add('visible');
                } else {
                    this.maxMessage.classList.remove('visible');
                }
            }
        }

        // Valider et passer à l'interface suivante
        async validateGroupSize() {
            console.log(`✅ [KioskWorkflow] Validation: ${this.groupSize} personne(s)`);

            // Bloquer si le chargement de capacité a échoué
            if (this.capacityLoadFailed) {
                alert('⚠️ Impossible de valider : la capacité de la salle n\'a pas pu être récupérée. Veuillez réessayer.');
                return;
            }

            // Re-vérifier la capacité en temps réel avant de valider
            await this.loadCapacity();

            // Vérification finale de la capacité
            if (this.capacityRemaining !== null && this.groupSize > this.capacityRemaining) {
                alert(`⚠️ Capacité insuffisante. Il ne reste que ${this.capacityRemaining} places disponibles.`);
                this.groupSize = Math.max(this.minGroupSize, this.capacityRemaining);
                this.updateDisplay();
                return;
            }

            // Sauvegarder le nombre de personnes dans localStorage
            localStorage.setItem('kioskGroupSize', this.groupSize);
            localStorage.setItem('kioskCapacityAtStart', this.capacityRemaining);

            console.log(`💾 [KioskWorkflow] Données sauvegardées: ${this.groupSize} personne(s), capacité: ${this.capacityRemaining}`);

            // Passer à l'interface 2 (kiosk-view - sélection des entrées)
            this.goToInterface2();
        }

        // Naviguer vers l'interface 2 (kiosk-view)
        goToInterface2() {
            console.log('🔄 [KioskWorkflow] Navigation vers Interface 2 (kiosk-view)');

            // Cacher l'interface 1
            if (this.interface1) {
                this.interface1.style.display = 'none';
                this.interface1.classList.remove('active');
            }

            // Afficher l'interface 2 (kiosk-view)
            const kioskView = document.getElementById('kiosk-view');
            if (kioskView) {
                kioskView.style.display = 'block';
                kioskView.classList.add('active');

                // Déclencher l'événement pour charger les données du kiosque
                if (typeof gestionEntreesInstance !== 'undefined' && gestionEntreesInstance) {
                    console.log('🔄 [KioskWorkflow] Synchronisation avec GestionEntrees');
                    
                    // Recharger les données du kiosque
                    if (typeof gestionEntreesInstance.renderKioskItems === 'function') {
                        gestionEntreesInstance.renderKioskItems();
                    }
                }
            }

            // Émettre un event custom pour sync avec interface-app
            document.dispatchEvent(new CustomEvent('kioskToViewTransition'));
        }

        // Réinitialiser l'interface (utile pour revenir en arrière)
        async reset() {
            this.groupSize = 1;
            this.capacityRemaining = null;
            this.capacityLoadFailed = false;
            
            if (this.capacityInterval) {
                clearInterval(this.capacityInterval);
                this.capacityInterval = null;
            }
            
            this.updateDisplay();
            await this.loadCapacity();
            await this.loadHeader();
            
            // Redémarrer le polling
            this.capacityInterval = setInterval(() => this.loadCapacity(), 10000);
        }
    }

    // Expose la classe globalement seulement si elle n'existe pas déjà
    if (typeof window.KioskWorkflow === 'undefined') {
        window.KioskWorkflow = KioskWorkflow;
    } else {
        console.warn('⚠️ [KioskWorkflow] Classe déjà déclarée globalement – utilisation de l\'existante');
    }

    // Instance globale (sur window pour cohérence)
    window.kioskWorkflowInstance = null;

    // Initialisation au DOMContentLoaded (log amélioré)
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📍 [KioskWorkflow] DOM chargé – classe exposée sur window');
        // L'initialisation sera déclenchée par interface-app.js au moment opportun
    });
})();
