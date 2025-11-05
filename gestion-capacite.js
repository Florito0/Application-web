// gestion-capacite.js - Version complète et corrigée

class GestionCapacite {
    constructor(containerId) {
        this.containerId = containerId;
        this.maxCapacity = 100;
        this.currentCount = 0;
        this.schedule = {};
        this.token = localStorage.getItem('token');
        this.apiUrl = '/api/capacite';
        this.discothequeId = null;
        this.userId = null;
        this.autoResetTimer = null;
        this.lastCheckedMinute = null;
        this.lastKnownCount = null;
        this.dataPollingTimer = null;
    }

    init() {
        this.getUserInfo().then(() => {
            this.loadData();
            this.attachEventListeners();
            this.startFrontendAutoResetCheck();
            this.startDataPolling();
        }).catch(error => {
            console.error('Erreur initialisation:', error);
            this.attachEventListeners();
            this.updateDisplay();
        });
    }

    // MÉTHODE MANQUANTE : Récupérer les informations utilisateur
    async getUserInfo() {
        try {
            const response = await fetch('/api/auth/current-user', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.userId = data.userId;
                this.discothequeId = data.discothequeId;
                console.log('User info loaded:', { userId: this.userId, discothequeId: this.discothequeId });
            } else {
                console.warn('Impossible de récupérer les infos utilisateur');
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des infos utilisateur:', error);
        }
    }

    // NOUVELLE MÉTHODE : Surveillance continue des données
    startDataPolling() {
        console.log('🔄 [POLLING] Démarrage de la surveillance des données');
        
        // Vérifier les données toutes les 10 secondes
        this.dataPollingTimer = setInterval(() => {
            this.checkForDataChanges();
        }, 10000);
    }

    // NOUVELLE MÉTHODE : Vérifier si les données ont changé côté serveur
    async checkForDataChanges() {
        try {
            // Charger les données sans mettre à jour l'affichage
            const response = await fetch(this.apiUrl, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    const serverCurrentCount = data[0].current || 0;
                    
                    // Détecter une réinitialisation automatique
                    if (this.lastKnownCount !== null && 
                        this.lastKnownCount > 0 && 
                        serverCurrentCount === 0) {
                        
                        console.log('🔄 [POLLING] Réinitialisation automatique détectée !');
                        
                        // Déclencher l'animation de réinitialisation
                        this.triggerAutoResetAnimation(this.lastKnownCount);
                        
                        // Mettre à jour les données locales
                        this.currentCount = serverCurrentCount;
                        this.maxCapacity = data[0].max || this.maxCapacity;
                        this.schedule = data[0].reset_schedule || this.schedule;
                        
                        // Actualiser l'affichage après l'animation
                        setTimeout(() => {
                            this.updateDisplay();
                        }, 2000);
                    }
                    
                    // Sauvegarder la valeur actuelle pour la prochaine comparaison
                    this.lastKnownCount = serverCurrentCount;
                }
            }
        } catch (error) {
            console.error('❌ [POLLING] Erreur lors de la vérification des données:', error);
        }
    }

    // NOUVELLE MÉTHODE : Animation spéciale pour la réinitialisation automatique
    triggerAutoResetAnimation(previousCount) {
        console.log(`🎬 [ANIMATION] Démarrage animation réinitialisation ${previousCount} → 0`);
        
        // Afficher la notification
        this.showAutoResetNotification();
        
        // Animation du compteur qui descend progressivement
        const currentCapacityEl = document.getElementById('current-capacity-display');
        const capacityFillEl = document.getElementById('capacity-fill');
        
        if (currentCapacityEl) {
            let currentDisplayValue = previousCount;
            const step = Math.max(1, Math.floor(previousCount / 20)); // Animation en 20 étapes max
            
            const animationInterval = setInterval(() => {
                currentDisplayValue = Math.max(0, currentDisplayValue - step);
                currentCapacityEl.textContent = currentDisplayValue;
                
                // Mettre à jour la barre de progression
                if (capacityFillEl && this.maxCapacity > 0) {
                    const percentage = (currentDisplayValue / this.maxCapacity) * 100;
                    capacityFillEl.style.width = `${percentage}%`;
                }
                
                // Animation terminée
                if (currentDisplayValue <= 0) {
                    clearInterval(animationInterval);
                    currentCapacityEl.textContent = '0';
                    if (capacityFillEl) {
                        capacityFillEl.style.width = '0%';
                    }
                    
                    // Effet de pulsation finale
                    currentCapacityEl.style.animation = 'pulse 0.5s ease-in-out 3';
                    setTimeout(() => {
                        if (currentCapacityEl) {
                            currentCapacityEl.style.animation = '';
                        }
                    }, 1500);
                    
                    console.log('✅ [ANIMATION] Animation de réinitialisation terminée');
                }
            }, 100); // Animation toutes les 100ms
        }
    }    

    // Démarrer la vérification côté frontend
    startFrontendAutoResetCheck() {
        console.log('🕐 [FRONTEND] Démarrage vérification auto-reset');
        
        // Vérifier toutes les 30 secondes (plus réactif que le backend)
        this.autoResetTimer = setInterval(() => {
            this.checkFrontendAutoReset();
        }, 30000);
        
        // Vérification immédiate
        this.checkFrontendAutoReset();
    }

    // Vérifier si une réinitialisation est programmée maintenant
    async checkFrontendAutoReset() {
        const now = new Date();
        const currentDay = now.toLocaleDateString('fr-FR', { weekday: 'long' }).toLowerCase();
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM
        const currentMinute = now.getMinutes();
        
        // Éviter les vérifications multiples dans la même minute
        if (this.lastCheckedMinute === currentMinute) return;
        this.lastCheckedMinute = currentMinute;
        
        console.log(`🕐 [FRONTEND] Vérification ${currentDay} ${currentTime}`);
        
        if (this.schedule && this.schedule[currentDay]) {
            const scheduledTime = this.schedule[currentDay];
            
            if (scheduledTime !== 'Désactivé' && scheduledTime === currentTime) {
                console.log('🔄 [FRONTEND] Réinitialisation automatique déclenchée !');
                
                // Afficher une notification
                this.showAutoResetNotification();
                
                // Recharger les données depuis le serveur (au cas où le backend l'aurait déjà fait)
                setTimeout(() => {
                    this.loadData();
                }, 2000);
            }
        }
    }

    // Afficher une notification de réinitialisation automatique
    showAutoResetNotification() {
        this.showAlert('🔄 Réinitialisation automatique en cours...', 'info');
        
        // Animation supplémentaire de l'interface
        const container = document.querySelector('#gestion-capacite .container');
        if (container) {
            container.style.border = '2px solid #3399ff';
            container.style.boxShadow = '0 0 20px rgba(51, 153, 255, 0.5)';
            
            setTimeout(() => {
                container.style.border = '';
                container.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)';
            }, 3000);
        }
    }

    // MÉTHODE AMÉLIORÉE : loadData met à jour lastKnownCount
    async loadData() {
        try {
            const response = await fetch(this.apiUrl, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    const capaciteData = data[0];
                    this.maxCapacity = capaciteData.max || 100;
                    this.currentCount = capaciteData.current || 0;
                    this.lastKnownCount = this.currentCount; // ← NOUVEAU : sauvegarder
                    this.schedule = capaciteData.reset_schedule || {};
                    this.updateDisplay();
                    
                    // Charger le planning seulement si on est sur l'interface de planification
                    const autoResetInterface = document.getElementById('capaciteAutoResetInterface');
                    if (autoResetInterface && autoResetInterface.style.display !== 'none') {
                        this.loadSchedule();
                    }
                } else {
                    this.updateDisplay();
                }
            } else {
                console.warn('Pas de données de capacité trouvées');
                this.updateDisplay();
            }
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            this.updateDisplay();
        }
    }

    async saveData() {
        // Si on n'a pas les IDs nécessaires, on essaye de les récupérer
        if (!this.discothequeId || !this.userId) {
            await this.getUserInfo();
        }

        // Si on n'a toujours pas les IDs, on ne peut pas sauvegarder
        if (!this.discothequeId || !this.userId) {
            console.warn('Impossible de sauvegarder : IDs manquants');
            return false;
        }

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    discotheque_id: this.discothequeId,
                    user_id: this.userId,
                    max: this.maxCapacity,
                    current: this.currentCount,
                    reset_schedule: this.schedule
                })
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('Erreur serveur:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            return false;
        }
    }

    interpolateColor(color1, color2, factor) {
        const r1 = parseInt(color1.slice(1, 3), 16);
        const g1 = parseInt(color1.slice(3, 5), 16);
        const b1 = parseInt(color1.slice(5, 7), 16);
        const r2 = parseInt(color2.slice(1, 3), 16);
        const g2 = parseInt(color2.slice(3, 5), 16);
        const b2 = parseInt(color2.slice(5, 7), 16);

        const r = Math.round(r1 + (r2 - r1) * factor);
        const g = Math.round(g1 + (g2 - g1) * factor);
        const b = Math.round(b1 + (b2 - b1) * factor);

        return `rgb(${r}, ${g}, ${b})`;
    }

    updateDisplay() {
        const currentCapacityEl = document.getElementById('current-capacity-display');
        const capacityFillEl = document.getElementById('capacity-fill');
        const capacityTextEl = document.getElementById('capacity-text-display');
        const currentInput = document.getElementById('current-count-input');
        const maxInput = document.getElementById('max-capacity-input');
        
        if (currentCapacityEl) currentCapacityEl.textContent = this.currentCount;
        if (currentInput) currentInput.value = this.currentCount;
        if (maxInput) maxInput.value = this.maxCapacity;
        
        const percentage = this.maxCapacity > 0 ? (this.currentCount / this.maxCapacity) * 100 : 0;
        if (capacityFillEl) {
            capacityFillEl.style.width = `${percentage}%`;
            
            const startColor1 = '#9733EE';
            const startColor2 = '#DA22FF';
            const endColor = '#ff4444';
            const factor = this.maxCapacity > 0 ? this.currentCount / this.maxCapacity : 0;
            
            const dynamicEndColor = this.interpolateColor(startColor2, endColor, factor);
            capacityFillEl.style.background = `linear-gradient(to right, ${startColor1}, ${dynamicEndColor})`;
        }
        
        if (capacityTextEl) {
            capacityTextEl.innerHTML = `${this.currentCount} / <span class="max-capacity">${this.maxCapacity}</span>`;
        }
    }

    // MÉTHODE AMÉLIORÉE : updateCount met à jour lastKnownCount
    async updateCount(change) {
        let newCount = this.currentCount + change;
        
        if (newCount < 0) newCount = 0;
        if (newCount > this.maxCapacity) newCount = this.maxCapacity;
        
        this.currentCount = newCount;
        this.lastKnownCount = newCount; // ← NOUVEAU : synchroniser
        this.updateDisplay();
        
        // Sauvegarde automatique avec debouncing
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.saveData();
        }, 500);
    }

    async updateCapacity() {
        const confirmed = await this.showConfirmation('Êtes-vous sûr de vouloir modifier la capacité d\'accueil ?');

    if (!confirmed) {
        // Si l'utilisateur clique sur "Non" ou ferme la modale, on arrête la fonction ici.
        return; 
    }
        const maxInput = document.getElementById('max-capacity-input');
        const updateBtn = document.getElementById('update-capacity-btn');
        
        this.maxCapacity = parseInt(maxInput.value) || 0;
        if (this.maxCapacity < 0) this.maxCapacity = 0;
        
        if (this.currentCount > this.maxCapacity) {
            this.currentCount = this.maxCapacity;
        }
        
        this.updateDisplay();
        
        const success = await this.saveData();
        
        if (updateBtn) {
        if (success) {
            updateBtn.style.background = 'linear-gradient(to right, #33cc33, #66ff66)';
            setTimeout(() => {
                updateBtn.style.background = 'linear-gradient(to right, #9733EE, #DA22FF)';
            }, 500);
            // On peut ajouter une alerte de succès ici si on le souhaite
            this.showAlert('Capacité d\'accueil mise à jour !', 'success');
        } else {
            updateBtn.style.background = 'linear-gradient(to right, #ff4444, #ff6666)';
            setTimeout(() => {
                updateBtn.style.background = 'linear-gradient(to right, #9733EE, #DA22FF)';
            }, 500);
            // On peut ajouter une alerte d'erreur ici si on le souhaite
            this.showAlert('Erreur lors de la mise à jour.', 'error');
        }
    }
}
   // ✅ NOUVELLE VERSION
async showConfirmation(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-confirmation-modal');
        const messageEl = document.getElementById('modal-message');
        const okBtn = document.getElementById('modal-button-ok');
        const cancelBtn = document.getElementById('modal-button-cancel');

        if (!modal || !okBtn || !cancelBtn) {
            console.error('Modale introuvable');
            resolve(false);
            return;
        }

        if (messageEl) messageEl.textContent = message;

        // Nettoyer les anciens listeners
        const newOkBtn = okBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        // Afficher la modale
        modal.style.display = 'flex';
        modal.classList.add('show');

        const handleOk = () => {
            modal.classList.remove('show');
            modal.style.display = 'none';
            resolve(true);
        };

        const handleCancel = () => {
            modal.classList.remove('show');
            modal.style.display = 'none';
            resolve(false);
        };

        newOkBtn.addEventListener('click', handleOk);
        newCancelBtn.addEventListener('click', handleCancel);
    });
}

    // MÉTHODE MODIFIÉE : Gérer la réinitialisation avec confirmation
    async handleReset() {
        console.log('🔄 [DEBUG] Début de handleReset');
        
        // Afficher la confirmation avec le message demandé
        const confirmed = await this.showConfirmation('Êtes-vous sûr de vouloir réinitialiser le nombre de clients actuel à 0 ?');
        
        if (confirmed) {
            console.log('✅ [DEBUG] Confirmation reçue, lancement de resetCount');
            await this.resetCount();
        } else {
            console.log('❌ [DEBUG] Réinitialisation annulée par l\'utilisateur');
        }
    }

    // MÉTHODE AMÉLIORÉE : resetCount met à jour lastKnownCount
    async resetCount() {
        try {
            console.log('🔄 [DEBUG] Appel API pour réinitialiser le compteur');
            
            const response = await fetch(`${this.apiUrl}/reset`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Erreur lors de la réinitialisation');
            }
            
            const data = await response.json();
            console.log('✅ [DEBUG] Réponse API:', data);
            
            // Mettre à jour l'affichage avec la nouvelle valeur
            this.currentCount = data.data.current;
            this.lastKnownCount = this.currentCount; // ← NOUVEAU : synchroniser
            this.updateDisplay();
            
            // Afficher un message de succès
            this.showAlert('Compteur réinitialisé avec succès!', 'success');
            
        } catch (error) {
            console.error('❌ Erreur lors de la réinitialisation:', error);
            this.showAlert(`Erreur lors de la réinitialisation: ${error.message}`, 'error');
        }
    }

    // NOUVELLE MÉTHODE : Nettoyer tous les timers
    destroy() {
        if (this.autoResetTimer) {
            clearInterval(this.autoResetTimer);
            console.log('🕐 [FRONTEND] Timer auto-reset arrêté');
        }
        
        if (this.dataPollingTimer) {
            clearInterval(this.dataPollingTimer);
            console.log('🔄 [POLLING] Timer polling arrêté');
        }
        
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
    }

    // Afficher des alertes
    showAlert(message, type = 'info') {
        const alertHtml = `
            <div class="capacite-alert ${type}">
                ${message}
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', alertHtml);
        const alert = document.querySelector('.capacite-alert:last-child');
        
        // Animation d'entrée
        setTimeout(() => {
            alert.classList.add('show');
        }, 10);
        
        // Suppression automatique après 3 secondes
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => {
                if (alert && alert.parentNode) {
                    alert.parentNode.removeChild(alert);
                }
            }, 300);
        }, 3000);
    }

    showAutoResetInterface() {
        const mainInterface = document.getElementById('capaciteMainInterface');
        const autoResetInterface = document.getElementById('capaciteAutoResetInterface');
        
        if (mainInterface) mainInterface.style.display = 'none';
        if (autoResetInterface) {
            autoResetInterface.style.display = 'block';
            this.renderScheduleDays();
        }
    }

    showMainInterface() {
        const mainInterface = document.getElementById('capaciteMainInterface');
        const autoResetInterface = document.getElementById('capaciteAutoResetInterface');
        
        if (autoResetInterface) autoResetInterface.style.display = 'none';
        if (mainInterface) mainInterface.style.display = 'block';
    }

    renderScheduleDays() {
    const scheduleSection = document.querySelector('#capaciteAutoResetInterface .schedule-section');
    if (!scheduleSection) return;

    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    let html = `
        <div class="schedule-header">
            <h3>Planifier la réinitialisation automatique</h3>
            <p class="schedule-info">
                <i class="fas fa-info-circle"></i>
                Mode horaire: La réinitialisation se déclenchera à l'heure pile (ex: 12h00, 13h00, etc.)
            </p>
        </div>
    `;

    days.forEach(day => {
        const dayKey = day.toLowerCase();
        const isEnabled = this.schedule[dayKey] && this.schedule[dayKey] !== 'Désactivé';
        const time = isEnabled ? this.schedule[dayKey] : '12:00';
        const hourOnly = time.split(':')[0];

        // --- PARTIE MODIFIÉE CI-DESSOUS ---
        html += `
            <div class="day-schedule">
                <div class="day-header ${isEnabled ? 'active' : ''}">
                    <input type="checkbox" class="toggle" id="${dayKey}-toggle" data-day="${dayKey}" ${isEnabled ? 'checked' : ''}>
                    <span class="day-name">${day}</span>
                    <span class="status ${isEnabled ? 'active' : 'inactive'}">${isEnabled ? 'Activé' : 'Désactivé'}</span>
                    <div class="time-selector">
                        <select class="hour-select" data-day="${dayKey}" ${!isEnabled ? 'disabled' : ''}>
                            ${this.generateHourOptions(hourOnly)}
                        </select>
                        </div>
                </div>
            </div>
        `;
        // --- FIN DE LA PARTIE MODIFIÉE ---
    });

    html += `
        <div class="schedule-actions">
            <button class="update-btn" id="save-schedule-btn" data-tooltip="Enregistrer la planification de réinitialisation">
                <i class="fas fa-save"></i> Enregistrer la planification
            </button>
            <button class="back-btn" id="back-to-main-btn">
                <i class="fas fa-arrow-left"></i> Retour à Gestion Capacité
            </button>
        </div>
    `;

    scheduleSection.innerHTML = html;
    this.attachScheduleListeners();}

// Nouvelle méthode pour générer les options d'heures
generateHourOptions(selectedHour = '12') {
    let options = '';
    for (let hour = 0; hour < 24; hour++) {
        // Formate l'heure sur deux chiffres (ex: "09")
        const hourStr = hour.toString().padStart(2, '0');
        
        // Crée le texte à afficher (ex: "09h00")
        const displayFormat = `${hourStr}h00`; 

        // Détermine si cette option est sélectionnée
        const selected = hourStr === selectedHour ? 'selected' : '';
        
        // La 'value' reste "09" mais le texte affiché est "09h00"
        options += `<option value="${hourStr}" ${selected}>${displayFormat}</option>`;
    }
    return options;
}

// Méthode modifiée pour les event listeners
attachScheduleListeners() {
    document.querySelectorAll('#capaciteAutoResetInterface .toggle').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const dayHeader = e.target.closest('.day-header');
            const hourSelect = dayHeader.querySelector('.hour-select');
            const status = dayHeader.querySelector('.status');
            
            hourSelect.disabled = !e.target.checked;
            dayHeader.classList.toggle('active', e.target.checked);
            
            if (e.target.checked) {
                status.textContent = 'Activé';
                status.classList.remove('inactive');
                status.classList.add('active');
            } else {
                status.textContent = 'Désactivé';
                status.classList.remove('active');
                status.classList.add('inactive');
            }
        });
    });

    const saveBtn = document.getElementById('save-schedule-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => this.saveSchedule());
    }

    const backBtn = document.getElementById('back-to-main-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => this.showMainInterface());
    }
}

// Méthode modifiée pour charger le planning
loadSchedule() {
    if (!this.schedule || Object.keys(this.schedule).length === 0) return;

    const autoResetInterface = document.getElementById('capaciteAutoResetInterface');
    if (!autoResetInterface || autoResetInterface.style.display === 'none') return;

    Object.keys(this.schedule).forEach(dayKey => {
        const toggle = document.getElementById(`${dayKey}-toggle`);
        if (!toggle) return;
        
        const dayHeader = toggle.closest('.day-header');
        if (!dayHeader) return;
        
        const hourSelect = dayHeader.querySelector('.hour-select');
        const status = dayHeader.querySelector('.status');
        
        if (toggle && hourSelect) {
            const isEnabled = this.schedule[dayKey] && this.schedule[dayKey] !== 'Désactivé';
            toggle.checked = isEnabled;
            hourSelect.disabled = !isEnabled;
            
            if (isEnabled) {
                // Extraire l'heure du format HH:MM
                const hour = this.schedule[dayKey].split(':')[0];
                hourSelect.value = hour;
                
                dayHeader.classList.add('active');
                if (status) {
                    status.textContent = 'Activé';
                    status.classList.remove('inactive');
                    status.classList.add('active');
                }
            } else {
                dayHeader.classList.remove('active');
                if (status) {
                    status.textContent = 'Désactivé';
                    status.classList.remove('active');
                    status.classList.add('inactive');
                }
            }
        }
    });
}

// Méthode modifiée pour sauvegarder
async saveSchedule() {
    const confirmed = await this.showConfirmation('Souhaitez-vous enregistrer la planification de réinitialisation automatique ?');
    if (!confirmed) return;

    const newSchedule = {};

    document.querySelectorAll('#capaciteAutoResetInterface .day-schedule').forEach(day => {
        const toggle = day.querySelector('.toggle');
        const hourSelect = day.querySelector('.hour-select');
        const dayName = day.querySelector('.day-name').textContent;
        const dayKey = dayName.toLowerCase();

        if (toggle.checked && hourSelect.value !== null) {
            // Format : HH:00 (toujours à la minute 00)
            newSchedule[dayKey] = `${hourSelect.value}:00`;
        } else {
            newSchedule[dayKey] = 'Désactivé';
        }
    });

    this.schedule = newSchedule;
    const success = await this.saveData();
    
    if (success) {
        this.showAlert('Planification horaire enregistrée avec succès !', 'success');
        setTimeout(() => {
            this.showMainInterface();
        }, 1500);
    } else {
        this.showAlert('Erreur lors de l\'enregistrement. Veuillez réessayer.', 'error');
    }
}

    // MÉTHODE CORRIGÉE : Attacher les event listeners
    attachEventListeners() {
        // Bouton de mise à jour de capacité
        const updateBtn = document.getElementById('update-capacity-btn');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => this.updateCapacity());
        }

        // Boutons de contrôle +/-
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const change = parseInt(e.target.getAttribute('data-change') || e.target.closest('button').getAttribute('data-change'));
                if (change) this.updateCount(change);
            });
        });

        // CORRIGÉ : Bouton de réinitialisation utilise maintenant handleReset
        const resetBtn = document.getElementById('show-reset-modal-btn');
        if (resetBtn) {
            console.log('🔧 [DEBUG] Event listener attaché au bouton de réinitialisation');
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔄 [DEBUG] Clic sur le bouton de réinitialisation');
                this.handleReset();
            });
        } else {
            console.warn('⚠️ [DEBUG] Bouton de réinitialisation non trouvé');
        }

        // Bouton de planification
        const autoResetBtn = document.getElementById('show-auto-reset-btn');
        if (autoResetBtn) {
            autoResetBtn.addEventListener('click', () => this.showAutoResetInterface());
        }
    }
}

// Export pour Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GestionCapacite;
}
