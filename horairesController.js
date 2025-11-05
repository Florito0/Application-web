const pool = require("../db");

// Récupère la discothèque du user; si aucune, en crée une par défaut
async function getOrCreateDiscothequeId(userId, clientOrPool = pool) {
  const client = clientOrPool.query ? clientOrPool : pool;
  const { rows } = await client.query(
    `SELECT id FROM public.discotheques
      WHERE user_id = $1
      ORDER BY id
      LIMIT 1`,
    [userId]
  );
  if (rows[0]) return rows[0].id;

  const created = await client.query(
    `INSERT INTO public.discotheques (user_id, nom)
     VALUES ($1, $2)
     RETURNING id`,
    [userId, "Mon établissement"]
  );
  return created.rows[0].id;
}

// GET /api/horaires
const getHoraires = async (req, res) => {
  try {
    const userId = req?.user?.id;
    if (!userId) return res.status(401).json({ message: "Non authentifié" });

    // Pour les SELECT avec RLS, on peut utiliser le pool directement
    // mais il faut définir la variable de session
    const client = await pool.connect();
    try {
      await client.query(`SET app.user_id = '${userId}'`);
      const discothequeId = await getOrCreateDiscothequeId(userId, client);

      const { rows } = await client.query(
        `SELECT jour_semaine, slot_numero, heure_debut, heure_fin
           FROM public.horaires
          WHERE discotheque_id = $1
          ORDER BY jour_semaine, slot_numero`,
        [discothequeId]
      );
      res.json(rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ Erreur GET horaires:", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des horaires" });
  }
};

// POST /api/horaires
const saveHoraires = async (req, res) => {
  console.log('🕐 [HORAIRES] Début saveHoraires');
  console.log('🕐 [HORAIRES] req.user:', req.user);
  console.log('🕐 [HORAIRES] req.body:', req.body);
  
  const client = await pool.connect();
  try {
    const userId = req?.user?.id;
    if (!userId) return res.status(401).json({ message: "Non authentifié" });

    // IMPORTANT : Définir la variable de session pour RLS
    await client.query(`SET app.user_id = '${userId}'`);

    const discothequeId = await getOrCreateDiscothequeId(userId, client);

    const { horaires } = req.body;
    if (!Array.isArray(horaires)) {
      return res.status(400).json({ message: "Format invalide: 'horaires' doit être un tableau" });
    }

    // Aplatit: accepte [{jour, slot, ...}] OU [{jour, slots:[...]}]
    const flat = [];
    for (const h of horaires) {
      if (Array.isArray(h.slots)) {
        for (const s of h.slots) {
          flat.push({
            jour_semaine: String(h.jour_semaine || h.jour || "").toLowerCase(),
            slot_numero: Number(s.slot_numero ?? s.slot ?? 0),
            heure_debut: s.heure_debut && s.heure_fin ? s.heure_debut : null,
            heure_fin:   s.heure_debut && s.heure_fin ? s.heure_fin   : null
          });
        }
      } else {
        flat.push({
          jour_semaine: String(h.jour_semaine || h.jour || "").toLowerCase(),
          slot_numero: Number(h.slot_numero ?? h.slot ?? 0),
          heure_debut: h.heure_debut && h.heure_fin ? h.heure_debut : null,
          heure_fin:   h.heure_debut && h.heure_fin ? h.heure_fin   : null
        });
      }
    }

    // Ne garder que slots 1 et 2 et jours non vides
    const payload = flat.filter(h =>
      (h.slot_numero === 1 || h.slot_numero === 2) && !!h.jour_semaine
    );

    await client.query("BEGIN");

    // Supprime les slots vides
    for (const { jour_semaine, slot_numero, heure_debut, heure_fin } of payload) {
      if (!heure_debut || !heure_fin) {
        await client.query(
          `DELETE FROM public.horaires
            WHERE discotheque_id = $1 AND jour_semaine = $2 AND slot_numero = $3`,
          [discothequeId, jour_semaine, slot_numero]
        );
      }
    }

    // DELETE + INSERT des slots remplis (avec user_id ajouté)
    for (const { jour_semaine, slot_numero, heure_debut, heure_fin } of payload) {
      if (heure_debut && heure_fin) {
        // D'abord supprimer l'ancien enregistrement s'il existe
        await client.query(
          `DELETE FROM public.horaires
            WHERE discotheque_id = $1 AND jour_semaine = $2 AND slot_numero = $3`,
          [discothequeId, jour_semaine, slot_numero]
        );
        
        // Puis insérer le nouvel enregistrement
        await client.query(
          `INSERT INTO public.horaires
              (discotheque_id, jour_semaine, slot_numero, heure_debut, heure_fin, user_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [discothequeId, jour_semaine, slot_numero, heure_debut, heure_fin, userId]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Erreur POST horaires:", {
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      message: error.message
    });
    res.status(500).json({ message: "Erreur serveur lors de la sauvegarde des horaires" });
  } finally {
    client.release();
  }
};

module.exports = { getHoraires, saveHoraires };
