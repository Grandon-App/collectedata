// Lang aplikasyon an: Kreyòl (defo) oswa Français.
// Tèks yo ekri an kreyòl nan kòd la; lè lang lan se "fr", tradiktè a ranplase fraz yo
// nan paj la (tèks, placeholder, aria-label, title) ak nan mesaj yo (toast, popup, erè).

// Fraz → tradiksyon. Pi long yo aplike anvan pi kout yo.
const FR = {
  // Navigasyon / tit
  "Mwa": "Mois", "depi": "depuis", "estimasyon": "estimation", "Semèn sa a": "Cette semaine", "fè deja": "déjà fait", "rete": "reste", "sou": "sur", "pou": "pour", "kliyan pou": "clients pour",
  "Samdi a, w ap evalye sou total depo semèn nan konpare ak objektif la.": "Samedi, vous serez évalué sur le total des dépôts de la semaine par rapport à l'objectif.",
  "Samdi a, w ap evalye sou kantite nouvo kliyan semèn nan.": "Samedi, vous serez évalué sur le nombre de nouveaux clients de la semaine.",
  "Fen mwa a": "Fin du mois", "Si w kenbe ritm sa a": "À ce rythme", "Pou rive sou objektif la": "Pour atteindre l'objectif", "jou ki rete yo": "jours restants",
  "Rete pou kolekte jiska fen mwa a": "Reste à collecter d'ici la fin du mois", "sem.": "sem.", "goud pa jou, pa mwa ajan an": "gourdes par jour, selon le mois de l'agent",
  "Yon mwa": "Un mois", "Apre dènye mwa a, objektif la rete menm jan an.": "Après le dernier mois, l'objectif reste le même.", "Dat debi ajan yo": "Date de début des agents",
  "Mwa 1 kòmanse dat sa a. Si w pa mete dat, aplikasyon an pran dat premye kont nan pòtfèy ajan an (estimasyon).": "Le mois 1 commence à cette date. Sans date, l'application prend la date du premier compte du portefeuille de l'agent (estimation).",
  "Dat debi a pa ka nan lavni.": "La date de début ne peut pas être dans le futur.",
  "Mwayèn depo ajan an fè pa jou travay nan mwa a (lendi–samdi, san jou ferye). Objektif la monte chak mwa depi dat debi ajan an.": "Moyenne des dépôts de l'agent par jour ouvrable du mois (lundi–samedi, hors jours fériés). L'objectif augmente chaque mois depuis la date de début de l'agent.",
  "Dwe sou cycle yo": "Dû sur les cycles", "ak reta mwa anvan yo": "avec les retards des mois précédents", "Dwe sou cycle la": "Dû sur le cycle", "Dwe mwa a": "Dû ce mois", "pou mwa a": "pour le mois", "sou cycle yo": "sur les cycles",
  "«Te dwe peye» = jou peman kliyan an nan mwa a (depi debi cycle li), san jou ferye, × plan li. «Peye» = depo sou kont lan nan mwa a (depo an atant yo konte, sa ki rejte yo pa konte). «Dwe mwa a» = te dwe peye − peye. «Dwe sou cycle la» = sa kliyan an te dwe depi debi cycle li − tout sa l peye sou cycle la (reta mwa anvan yo konte); «Vèsman» = kantite jou plan sa reprezante. Yon kliyan ki peye davans pa kouvri lòt kliyan. Kont ki fèmen pa konte.": "« Dû » = jours de paiement du client dans le mois (depuis le début de son cycle), hors jours fériés, × son plan. « Payé » = dépôts du mois (en attente inclus, rejetés exclus). « Dû ce mois » = dû − payé. « Dû sur le cycle » = dû depuis le début du cycle − tout ce qui a été payé sur le cycle (retards des mois précédents inclus) ; « Versements » = nombre de jours de plan correspondants. Un client en avance ne compense pas un autre. Les comptes fermés ne sont pas comptés.",
  "Mobilizasyon ak nouvo kliyan": "Mobilisation et nouveaux clients", "Moyenne mobilisation, nouvo kliyan, evolisyon pa ajan · PDF": "Moyenne de mobilisation, nouveaux clients, évolution par agent · PDF",
  "Depo ekip la nan mwa a": "Dépôts de l'équipe ce mois", "Moyenne mobilisation ekip la": "Moyenne de mobilisation de l'équipe", "pa jou travay": "par jour ouvrable", "Nouvo kliyan nan mwa a": "Nouveaux clients du mois",
  "objektif": "objectif", "Moyenne mobilisation pa ajan": "Moyenne de mobilisation par agent", "Objektif / jou": "Objectif / jour", "Moyenne": "Moyenne", "Depo mwa a": "Dépôts du mois", "obj.": "obj.",
  "Fen mwa (ritm sa a)": "Fin du mois (à ce rythme)", "Bezwen / jou": "Nécessaire / jour", "Nouvo kliyan pa ajan": "Nouveaux clients par agent", "Mwa sa a": "Ce mois", "Objektif jiska jodi a": "Objectif à ce jour",
  "Mwa pase": "Mois dernier", "Dat": "Date", "Evolisyon moyenne mobilisation": "Évolution de la moyenne de mobilisation", "Semèn": "Semaine", "Nan rapò yo ak tablo ekip la": "Dans les rapports et le tableau d'équipe",
  "Moyenne mobilisation = depo ajan an fè (pa rejte, san viman) ÷ jou travay pase nan mwa a (lendi–samdi, san jou ferye). Objektif la swiv eskalye Paramèt la dapre mwa ajan an depi dat debi l. Nouvo kliyan = moun ki gen premye kont yo nan mwa a nan pòtfèy ajan an, konpare ak ritm mwa a. Koulè yo swiv limit Paramèt la.": "Moyenne de mobilisation = dépôts de l'agent (non rejetés, hors virements) ÷ jours ouvrables écoulés du mois (lundi–samedi, hors fériés). L'objectif suit l'échelle des Paramètres selon le mois de l'agent depuis sa date de début. Nouveaux clients = personnes dont le premier compte du mois est dans le portefeuille de l'agent, comparé au rythme du mois. Les couleurs suivent les seuils des Paramètres.",
  "Moun ki gen dwa siyati": "Personne autorisée à signer", "Non konplè moun nan": "Nom complet de la personne", "Pyès idantifikasyon": "Pièce d'identification", "Nimewo pyès la": "Numéro de la pièce",
  "Foto pyès la": "Photo de la pièce", "Si moun nan pa gen pyès la sou li, pran foto moun nan.": "Si la personne n'a pas sa pièce sur elle, prenez sa photo.", "Pran foto": "Prendre une photo",
  "Mete non konplè moun ki gen dwa siyati a.": "Saisissez le nom complet de la personne autorisée à signer.", "Chwazi tip pyès idantifikasyon an.": "Choisissez le type de pièce d'identification.",
  "Mete nimewo pyès idantifikasyon an.": "Saisissez le numéro de la pièce d'identification.", "Pran foto pyès la (oswa foto moun nan).": "Prenez la photo de la pièce (ou de la personne).",
  "Chanje moun nan": "Changer la personne", "Ajoute yon moun": "Ajouter une personne", "Pou cycle sa a sèlman.": "Pour ce cycle uniquement.",
  "Pa gen moun ki gen dwa siyati sou cycle sa a.": "Aucune personne autorisée à signer sur ce cycle.", "Demann an atant manadjè a": "Demande en attente du manager",
  "Moun sa a ap gen dwa siyati sou cycle sa a sèlman, pa sou lòt cycle kliyan an.": "Cette personne pourra signer sur ce cycle uniquement, pas sur les autres cycles du client.",
  "Demann lan ale bay manadjè a pou l valide l.": "La demande est envoyée au manager pour validation.", "Moun ki gen dwa siyati kounye a": "Personne autorisée actuelle",
  "Nouvo moun nan ap ranplase l.": "La nouvelle personne la remplacera.", "Mete enfòmasyon moun nan.": "Saisissez les informations de la personne.",
  "Moun ki gen dwa siyati a anrejistre.": "Personne autorisée enregistrée.", "Ajoute yon moun ki gen dwa siyati": "Ajouter une personne autorisée à signer",
  "Chanje moun ki gen dwa siyati": "Changer la personne autorisée à signer", "Ranplase": "Remplace", "opsyonèl": "facultatif",
  "Modifikasyon apwouve: ajan an poko korije l": "Modification approuvée : l'agent ne l'a pas encore corrigée", "Demann modifikasyon an atant": "Demande de modification en attente",
  "trete l anvan ou valide": "traitez-la avant de valider", "Depo sa a gen yon demann modifikasyon an atant. Trete demann lan anvan ou valide l.": "Ce dépôt a une demande de modification en attente. Traitez la demande avant de le valider.",
  "depo gen demann modifikasyon: yo pa valide": "dépôts avec demande de modification : non validés", "gen demann modifikasyon": "avec demande de modification",
  "Rapò rekouvreman": "Rapport de recouvrement", "Kòb kliyan yo dwe pou mwa a, pa ajan · PDF": "Montants dus par les clients ce mois-ci, par agent · PDF",
  "Enprime le": "Imprimé le", "Tout ajan yo": "Tous les agents", "Telechaje PDF": "Télécharger PDF", "Kliyan te dwe peye": "Dû par les clients", "Rantre": "Encaissé",
  "Poko rantre": "Non encaissé", "kliyan ki dwe": "clients débiteurs", "kont": "comptes", "Pa ajan": "Par agent", "Kont": "Comptes", "Te dwe peye": "Dû", "Kliyan dwe": "Clients débiteurs",
  "Kliyan ki dwe, pa ajan": "Clients débiteurs, par agent", "rantre": "encaissé", "kliyan dwe sou": "clients débiteurs sur", "poko rantre": "non encaissé", "Peye": "Payé", "Dwe": "Dû",
  "Vèsman": "Versements", "Okenn kliyan pa dwe.": "Aucun client débiteur.", "Pa gen peman prevwa pou mwa sa a.": "Aucun paiement prévu pour ce mois.",
  "«Te dwe peye» = jou peman kliyan an nan mwa a (depi debi cycle li), san jou ferye, × plan li. «Peye» = depo sou kont lan nan mwa a (depo an atant yo konte, sa ki rejte yo pa konte). «Dwe» = te dwe peye − peye. Yon kliyan ki peye davans pa kouvri lòt kliyan. Kont ki fèmen pa konte.": "« Dû » = jours de paiement du client dans le mois (depuis le début de son cycle), hors jours fériés, × son plan. « Payé » = dépôts sur le compte dans le mois (dépôts en attente inclus, rejetés exclus). « Dû » restant = dû − payé. Un client en avance ne compense pas un autre. Les comptes fermés ne sont pas comptés.",
  "Moyenne mobilisation": "Moyenne mobilisation", "Nouvo kliyan mwa a": "Nouveaux clients du mois", "Rekouvreman mwa a": "Recouvrement du mois",
  "Mwayèn depo ajan an fè pa jou travay nan mwa a (lendi–samdi, san jou ferye).": "Moyenne des dépôts de l'agent par jour ouvrable du mois (lundi–samedi, hors jours fériés).",
  "Kliyan ajan an ouvri premye kont yo nan mwa a.": "Clients dont l'agent a ouvert le premier compte ce mois-ci.",
  "Pousantaj sa kliyan pòtfèy la te dwe peye depi 1ye mwa a ki rantre.": "Pourcentage de ce que les clients du portefeuille devaient payer depuis le 1er du mois qui est rentré.",
  "Objektif mwa a": "Objectifs du mois", "Objektif ekip la · mwa a": "Objectifs de l'équipe · ce mois", "Objektif": "Objectif", "jiska jodi a": "à ce jour", "jou travay": "jours ouvrables",
  "Vèt": "Vert", "Jòn": "Jaune", "Wouj": "Rouge", "Chanje": "Modifier", "Chanje metrik yo": "Modifier les indicateurs",
  "objektif la jiska jodi a": "de l'objectif à ce jour", "Pa gen peman prevwa nan mwa a.": "Aucun paiement prévu ce mois-ci.",
  "Metrik Tablo ajan yo": "Indicateurs du tableau des agents", "Chwazi metrik ajan yo wè sou Tablo yo, objektif chak mwa a ak limit koulè yo. Sa aplike pou sèvis sa a sèlman.": "Choisissez les indicateurs affichés sur le tableau des agents, les objectifs mensuels et les seuils de couleur. Cela s'applique à ce service uniquement.",
  "Metrik ki parèt": "Indicateurs affichés", "Objektif yo": "Objectifs", "goud pa jou": "gourdes par jour", "Koulè yo": "Couleurs", "Vèt apati": "Vert à partir de", "Jòn apati": "Jaune à partir de",
  "Anba limit jòn nan, metrik la wouj.": "Sous le seuil jaune, l'indicateur est rouge.", "Objektif yo pa bon.": "Objectifs invalides.", "Limit vèt la dwe pi wo pase limit jòn nan.": "Le seuil vert doit être supérieur au seuil jaune.",
  "Tablo de bò": "Tableau de bord", "Tablo": "Tableau", "Pòtfèy": "Portefeuille", "Pòtfèy mwen": "Mon portefeuille", "Poko wè": "Pas encore vu", "Pa jou peman": "Pas jour de paiement", "Kliyan": "Clients", "Epay": "Épargne", "Rapò": "Rapport",
  "Paramèt": "Paramètres", "Senkronizasyon": "Synchronisation", "Navigasyon prensipal": "Navigation principale",
  "Paj sa a ap vini byento.": "Cette page arrive bientôt.", "Bonjou": "Bonjour",
  // Koneksyon
  "Aplikasyon ajan": "Application agent", "Telefòn": "Téléphone", "Modpas": "Mot de passe", "Konekte": "Se connecter",
  "Ap konekte…": "Connexion…", "Ap telechaje done yo…": "Téléchargement des données…",
  "Telefòn oswa modpas la pa bon.": "Téléphone ou mot de passe incorrect.",
  "Mete nimewo telefòn ou (8 chif).": "Entrez votre numéro de téléphone (8 chiffres).",
  "Fòk ou gen entènèt pou premye koneksyon an.": "Une connexion internet est requise pour la première connexion.",
  "Sesyon w fini. Konekte ankò: done ki sou telefòn nan ap rete.": "Session expirée. Reconnectez-vous : les données du téléphone sont conservées.",
  "Sesyon w fini. Konekte ankò pou senkronize.": "Session expirée. Reconnectez-vous pour synchroniser.",
  "Kont sa a pa gen aksè nan Grandon.": "Ce compte n'a pas accès à Grandon.",
  "Gen done yon lòt ajan sou telefòn sa a ki poko voye. Se li ki pou konekte.": "Ce téléphone contient des données non envoyées d'un autre agent. Il doit se connecter.",
  "Ou pa konekte.": "Vous n'êtes pas connecté.",
  // Kliyan
  "Nouvo kliyan": "Nouveau client", "Kliyan Grandon yo": "Clients Grandon", "Nan baz la": "Dans la base",
  "Chèche non, ID kliyan oswa telefòn…": "Rechercher nom, ID client ou téléphone…", "Chèche non, ID kliyan, telefòn oswa nimewo kanè…": "Rechercher nom, ID client, téléphone ou numéro de carnet…", "Kanè": "Carnet", "Chèche kliyan": "Rechercher un client",
  "Chèche anvan w kreye yon kliyan, pou evite doublon.": "Recherchez avant de créer un client, pour éviter les doublons.",
  "Ap chèche nan baz la…": "Recherche dans la base…",
  "Moun sa yo deja nan baz la. Si se li, ajoute l nan Grandon olye w kreye l ankò.": "Ces personnes sont déjà dans la base. Si c'est elle, ajoutez-la à Grandon au lieu de la recréer.",
  "Pa gen lòt moun nan baz la ki koresponn.": "Aucune autre personne correspondante dans la base.",
  "Offline: rechèch la fèt sèlman nan kliyan ki sou telefòn nan.": "Hors ligne : recherche uniquement parmi les clients du téléphone.",
  "Pa gen koneksyon: rechèch lokal sèlman.": "Pas de connexion : recherche locale uniquement.",
  "Pa gen kliyan Grandon ki koresponn.": "Aucun client Grandon correspondant.", "Pa gen kliyan.": "Aucun client.",
  "Toupre m": "Près de moi", "Ap chèche pozisyon w…": "Recherche de votre position…",
  "Pa ka jwenn pozisyon w. Aktive GPS la.": "Position introuvable. Activez le GPS.",
  "Rechèch pa pozisyon bezwen entènèt.": "La recherche par position nécessite internet.",
  "Pa gen moun nan baz la nan zòn sa a.": "Personne dans la base dans cette zone.", "Kliyan toupre w": "Clients près de vous",
  "Ajoute": "Ajouter", "Se li": "C'est elle/lui", "Wè fich li": "Voir sa fiche", "ID poko vini": "ID en attente",
  "San cycle aktif": "Aucun cycle actif", "cycle aktif": "cycle(s) actif(s)",
  "Prenon": "Prénom", "Non konplè": "Nom complet", "Non": "Nom", "Sèks": "Sexe", "Fi": "Femme", "Gason": "Homme",
  "Adrès": "Adresse", "Kote biznis la": "Lieu d'activité", "Okipasyon": "Occupation", "Sektè": "Secteur",
  "Aktivite": "Activité", "Pwen de vant": "Point de vente", "Kapasite distribisyon": "Capacité de distribution",
  "Chwazi sektè a anvan": "Choisissez d'abord le secteur", "Chwazi…": "Choisir…",
  "Foto kliyan an": "Photo du client", "Foto a pa ka li.": "Impossible de lire la photo.",
  "GPS: ap chèche…": "GPS : recherche…", "GPS: pa jwenn (pa obligatwa)": "GPS : introuvable (facultatif)", "Rekòmanse": "Réessayer",
  "Kreye yon cycle Grandon touswit apre": "Créer un cycle Grandon juste après", "Anrejistre kliyan an": "Enregistrer le client",
  "Mete prenon ak non kliyan an.": "Indiquez le prénom et le nom du client.",
  "Nimewo telefòn nan dwe gen 8 chif.": "Le numéro de téléphone doit avoir 8 chiffres.",
  "Telefòn sa a deja nan baz la:": "Ce téléphone est déjà dans la base :",
  "Kliyan anrejistre sou telefòn nan. L ap voye lè gen entènèt.": "Client enregistré sur le téléphone. Il sera envoyé dès qu'il y aura internet.",
  "Kliyan anrejistre.": "Client enregistré.", "Kliyan sa a pa sou telefòn nan.": "Ce client n'est pas sur le téléphone.",
  "Kliyan an pa jwenn.": "Client introuvable.", "Enfòmasyon kliyan an": "Informations du client",
  "Modifye enfòmasyon yo": "Modifier les informations", "Mete ajou": "Mettre à jour", "Enfòmasyon yo anrejistre.": "Informations enregistrées.",
  "GPS aktive": "GPS activé", "Pa gen GPS": "Pas de GPS", "Pran pozisyon kounye a": "Prendre la position maintenant",
  "Wè sou kat la": "Voir sur la carte", "Pozisyon": "Position", "Kòd kliyan": "Code client",
  "Peze foto a pou wè l pi gwo": "Touchez la photo pour l'agrandir", "Fèmen": "Fermer",
  // Epay / cycle
  "Nouvo cycle": "Nouveau cycle", "Nouvo cycle Grandon": "Nouveau cycle Grandon", "Peman jodi a": "Paiements du jour",
  "Kont ak cycle aktif": "Comptes avec cycle actif", "Dènye tranzaksyon yo": "Dernières transactions",
  "Chèche kliyan oswa nimewo kont…": "Rechercher client ou numéro de compte…", "Chèche kont": "Rechercher un compte",
  "Pa gen peman ki tonbe jodi a.": "Aucun paiement prévu aujourd'hui.", "Pa gen kont ak cycle aktif.": "Aucun compte avec cycle actif.",
  "Poko gen tranzaksyon.": "Aucune transaction pour l'instant.", "Anyen pa koresponn.": "Aucun résultat.",
  "Nouvo cycle: chwazi kliyan an": "Nouveau cycle : choisir le client", "Kliyan an pa nan lis la? Chèche l nan": "Le client n'est pas dans la liste ? Cherchez-le dans",
  "Cycle yo": "Cycles", "Pa gen cycle.": "Aucun cycle.", "Cycle poko voye": "Cycle non envoyé", "cycle poko voye": "cycle non envoyé",
  "Dire": "Durée", "kantite mwa": "nombre de mois", "Frekans": "Fréquence", "kantite fwa pa semèn": "nombre de fois par semaine",
  "Jou peman yo": "Jours de paiement", "Jou peman": "Jours de paiement", "Plan": "Plan", "minimòm chak fwa li peye": "minimum à chaque paiement",
  "Dat kòmansman": "Date de début", "Fen cycle a": "Fin du cycle", "Minimòm pa semèn": "Minimum par semaine", "Minimòm sou": "Minimum sur",
  "peman": "paiements", "Kreye cycle a": "Créer le cycle", "Cycle la anrejistre.": "Cycle enregistré.",
  "Cycle la pa jwenn.": "Cycle introuvable.", "Cycle sa a pa sou telefòn nan.": "Ce cycle n'est pas sur le téléphone.",
  "Chwazi egzakteman": "Choisissez exactement", "jou peman.": "jours de paiement.", "Chwazi plan an.": "Choisissez le plan.",
  "Dat kòmansman an dwe ant 30 jou pase ak 30 jou devan.": "La date de début doit être entre 30 jours avant et 30 jours après.",
  "Total kliyan an mete": "Total versé par le client", "Balans valide": "Solde validé", "an atant validasyon": "en attente de validation",
  "poko voye": "non envoyé", "Plan (minimòm)": "Plan (minimum)", "pa semèn": "par semaine", "Kòmanse": "Début", "Fini": "Fin",
  "Peman jiska jodi a": "Paiements à ce jour", "jou peye": "jours payés", "jou prevwa": "jours prévus",
  "Tranzaksyon": "Transactions", "Depo / Retrè": "Dépôt / Retrait", "Depo": "Dépôt", "Retrè": "Retrait",
  "Montan (goud)": "Montant (gourdes)", "Minimòm plan an": "Minimum du plan", "deja peye jodi a": "déjà payé aujourd'hui",
  "Balans valide disponib": "Solde validé disponible", "Balans sou kanè a apre tranzaksyon an": "Solde du carnet après la transaction",
  "opsyonèl": "facultatif", "Nòt": "Note", "Anrejistre": "Enregistrer", "Mete montan an.": "Indiquez le montant.",
  "Depo anrejistre.": "Dépôt enregistré.", "Retrè anrejistre.": "Retrait enregistré.",
  "Peye jodi a": "Payé aujourd'hui", "Peman jodi a ": "Paiement aujourd'hui", "Aktif": "Actif", "Poko voye": "Non envoyé",
  "An atant validasyon": "En attente de validation", "Refize": "Refusé", "Erè sync": "Erreur sync", "Erè": "Erreur",
  "jodi a": "aujourd'hui", "Jodi a": "Aujourd'hui", "Yè": "Hier", "Avan-yè": "Avant-hier",
  // Rapò
  "Depo ankese": "Dépôts encaissés", "Balans deklare (total)": "Solde déclaré (total)", "kont deklare": "comptes déclarés",
  "Cycle kreye": "Cycles créés", "Kach nan men pou remèt nan kès": "Espèces à remettre à la caisse", "Depo − retrè": "Dépôts − retraits", "Depo − retrè peye": "Dépôts − retraits payés",
  "Klè, gwo bouton jòn safran. Fèt pou teren an, anba solèy.": "Clair, gros boutons jaune safran. Conçu pour le terrain, en plein soleil.",
  "Fonse, kontras fò, chif an premye. Ekonomi batri.": "Sombre, contraste fort, les chiffres d'abord. Économise la batterie.",
  "Ble marin ak lò. Elegan, pou kliyan ak manadjè.": "Bleu marine et or. Élégant, pour clients et managers.",
  "Fidbak yo": "Retours", "7 jou": "7 jours", "Filt fidbak": "Filtre des retours", "Pa gen fidbak jodi a.": "Aucun retour aujourd'hui.", "Pa gen fidbak nan 7 dènye jou yo.": "Aucun retour ces 7 derniers jours.", "Poko gen fidbak.": "Aucun retour pour le moment.",
  "Sa kliyan yo di lè yo pa peye (bouton «Pa peye»).": "Ce que les clients disent quand ils ne paient pas (bouton « N'a pas payé »).", "Lòt": "Autre", "Objektif jodi a": "Objectif du jour", "Mande otorizasyon": "Demander l'autorisation", "Kisa ou bezwen?": "De quoi avez-vous besoin ?", "Ki chan ou bezwen modifye?": "Quels champs voulez-vous modifier ?", "Rezon (obligatwa)": "Motif (obligatoire)", "Voye demann lan": "Envoyer la demande", "Demann lan voye bay manadjè a.": "Demande envoyée au manager.", "Siprime": "Supprimer", "Anile tranzaksyon an": "Annuler la transaction", "Retire kliyan an nan Grandon": "Retirer le client de Grandon", "An atant": "En attente", "Apwouve: ou ka modifye": "Approuvée : vous pouvez modifier", "Refize": "Refusée", "Fèt": "Effectuée", "Rezon": "Motif", "Demann modifikasyon": "Demandes de modification", "Pozisyon GPS": "Position GPS", "Montan": "Montant", "Balans kanè avan": "Solde carnet avant", "Balans kanè apre": "Solde carnet après", "Nòt": "Note", "Prenon": "Prénom", "Otorizasyon apwouve pou modifye": "Autorisation approuvée pour modifier", "Modifye kounye a": "Modifier maintenant", "Demann modifikasyon ou an an atant otorizasyon manadjè a.": "Votre demande de modification attend l'autorisation du manager.", "Pou modifye fich yon kliyan, ou bezwen otorizasyon yon manadjè. Di egzakteman ki chan ou bezwen chanje (telefòn, adrès…) ak poukisa.": "Pour modifier la fiche d'un client, il faut l'autorisation d'un manager. Indiquez exactement quels champs changer (téléphone, adresse…) et pourquoi.", "Demann ou an an atant. Ou ap ka modifye lè manadjè a apwouve l.": "Votre demande est en attente. Vous pourrez modifier une fois approuvée.", "Dènye demann": "Dernière demande", "Otorizasyon an valab yon sèl fwa, pou chan sa yo sèlman": "L'autorisation est valable une seule fois, pour ces champs uniquement", "Otorizasyon an valab yon sèl fwa, pou chan sa yo sèlman.": "L'autorisation est valable une seule fois, pour ces champs uniquement.", "Pa gen anyen ki chanje.": "Rien n'a changé.", "Peze «Pran pozisyon kounye a» pou GPS la.": "Touchez « Prendre la position » pour le GPS.", "Prenon ak non pa ka vid.": "Le prénom et le nom ne peuvent pas être vides.", "Otorizasyon apwouve: peze sou tranzaksyon an pou modifye l": "Autorisation approuvée : touchez la transaction pour la modifier", "Peze sou yon tranzaksyon pou modifye oswa anile l.": "Touchez une transaction pour la modifier ou l'annuler.", "Peze sou yon tranzaksyon pou mande otorizasyon pou modifye oswa anile l.": "Touchez une transaction pour demander l'autorisation de la modifier ou l'annuler.", "Modifye tranzaksyon an": "Modifier la transaction", "Modifikasyon an anrejistre.": "Modification enregistrée.", "Tranzaksyon an anile.": "Transaction annulée.", "Rezon (obligatwa pou anile)": "Motif (obligatoire pour annuler)", "Demann ou an atant.": "Votre demande est en attente.", "Bay otorizasyon pou modifye?": "Autoriser la modification ?", "Anile tranzaksyon sa a?": "Annuler cette transaction ?", "Retire kliyan sa a nan Grandon?": "Retirer ce client de Grandon ?", "Otorizasyon an bay.": "Autorisation accordée.", "Chan yo": "Champs", "Tranzaksyon sa a anile.": "Cette transaction est annulée.", "Tranzaksyon sa a poko voye.": "Cette transaction n'est pas encore envoyée.", "Modifikasyon": "Modification", "Kat": "Carte", "Kliyan mwen": "Mes clients", "Istorik modifikasyon": "Historique des modifications", "Jou anvan": "Jour précédent", "Jou apre": "Jour suivant", "Demann yo": "Demandes", "Apwouve yo": "Approuvées", "Refize yo": "Refusées", "Modifikasyon fèt": "Modifications faites", "Anilasyon": "Annulations", "Anile (apwouve)": "Annulée (approuvée)", "Modifikasyon dirèk manadjè": "Modification directe du manager", "Anile pa manadjè": "Annulée par le manager", "Avan": "Avant", "Apre": "Après", "Pa gen modifikasyon jou sa a.": "Aucune modification ce jour-là.", "Anile / refize": "Annulée / refusée", "poko voye": "non envoyé(s)", "Kliyan petèt doublon": "Clients en double possible", "Nouvo kliyan ki gen menm non ak yon moun ki deja nan baz la, men ak yon lòt telefòn. Verifye si se menm moun.": "Nouveaux clients portant le même nom qu'une personne déjà dans la base, mais avec un autre téléphone. Vérifiez s'il s'agit de la même personne.", "Nouvo": "Nouveau", "Deja kliyan Grandon": "Déjà client Grandon", "Deja nan baz la": "Déjà dans la base", "san telefòn": "sans téléphone", "Se 2 moun diferan": "Ce sont 2 personnes différentes", "Se menm moun": "C'est la même personne", "Fòk ou gen entènèt pou deside.": "Il faut Internet pour décider.", "Se menm moun?": "Même personne ?", "Dosye a ap make «doublon». Pa kreye cycle sou li; kontakte administratè a pou fizyone 2 dosye yo.": "Le dossier sera marqué « doublon ». Ne créez pas de cycle dessus ; contactez l'administrateur pour fusionner les 2 dossiers.", "Wi, se menm moun": "Oui, c'est la même personne", "Desizyon an anrejistre.": "Décision enregistrée.", "lwen kliyan an": "du client", "San GPS ajan": "Sans GPS agent", "GPS pa presi": "GPS imprécis", "Kliyan an pa gen GPS": "Client sans GPS", "Kote kliyan an": "Chez le client", "Fidbak pou verifye": "Retours à vérifier", "Fidbak ki pa t fèt kote kliyan an (plis pase 300 m), oswa san GPS · 7 dènye jou.": "Retours saisis loin du client (plus de 300 m) ou sans GPS · 7 derniers jours.", "Tout fidbak yo te fèt kote kliyan yo.": "Tous les retours ont été saisis chez les clients.", "fidbak pa fèt kote kliyan an": "retours saisis loin du client", "Yon fidbak pa fèt kote kliyan an": "Un retour saisi loin du client", "Ajan an te anrejistre «Pa peye» lwen biznis kliyan an, oswa san GPS.": "L'agent a enregistré « N'a pas payé » loin du commerce du client, ou sans GPS.", "pa presi. Aktive GPS telefòn nan, ale deyò, epi peze ankò.": "imprécis. Activez le GPS du téléphone, sortez, puis réessayez.", "Pozisyon apwoksimatif: aparèy sa a pa gen GPS presi.": "Position approximative : cet appareil n'a pas de GPS précis.", "Kliyan sa yo pa gen pozisyon GPS, se poutèt sa yo pa parèt sou kat la. Louvri fich yo → Modifye pou anrejistre GPS la.": "Ces clients n'ont pas de position GPS, c'est pourquoi ils n'apparaissent pas sur la carte. Ouvrez leur fiche → Modifier pour enregistrer le GPS.", "Kote m ye": "Ma position", "Pa ka jwenn pozisyon ou. Aktive GPS la epi bay aplikasyon an pèmisyon.": "Position introuvable. Activez le GPS et autorisez l'application.", "Kliyan yo": "Clients", "Pakou jodi a": "Parcours du jour", "Trajè ajan yo": "Trajets des agents", "San ajan": "Sans agent", "Kat la pa ka chaje.": "La carte ne peut pas être chargée.", "Louvri fich la": "Ouvrir la fiche", "kliyan sou kat la": "clients sur la carte", "kliyan san GPS": "clients sans GPS", "Kliyan san GPS": "Clients sans GPS", "Mete kliyan an reta yo tou": "Inclure aussi les clients en retard", "Ap chèche pozisyon ou…": "Recherche de votre position…", "Kliyan sa yo pa gen GPS.": "Ces clients n'ont pas de GPS.", "Pa gen kliyan pou wè jodi a.": "Aucun client à voir aujourd'hui.", "Ou la": "Vous êtes ici", "pou kolekte": "à collecter", "an liy dwat": "à vol d'oiseau", "Louvri nan Google Maps": "Ouvrir dans Google Maps", "GPS telefòn nan pa disponib: pakou a kòmanse nan premye kliyan an.": "GPS du téléphone indisponible : le parcours commence au premier client.", "Peman jodi a": "Paiement du jour", "Ap chaje trajè yo…": "Chargement des trajets…", "Fòk ou gen entènèt pou wè trajè jou sa a.": "Il faut Internet pour voir les trajets de ce jour.", "Offline: se dènye trajè ki te chaje pou jou sa a.": "Hors ligne : derniers trajets chargés pour ce jour.", "aksyon": "actions", "Pa gen aksyon ak GPS jou sa a.": "Aucune action avec GPS ce jour-là.", "Nouvo kliyan": "Nouveau client", "Nouvo cycle": "Nouveau cycle", "Ajan": "Agent", "Alèt": "Alertes", "＋ Nouvo alèt": "＋ Nouvelle alerte", "Mwen konprann": "J'ai compris", "Nouvo alèt": "Nouvelle alerte", "Tit": "Titre", "Mesaj pou ajan an": "Message pour l'agent", "Nivo": "Niveau", "Enfòmasyon": "Information", "Enpòtan": "Important", "Ijan": "Urgent", "Alèt la fèmen poukont li": "L'alerte se ferme d'elle-même", "Lè yon manadjè fèmen l": "Quand un manager la ferme", "Lè kliyan an pa an reta ankò": "Quand le client n'est plus en retard", "Lè kliyan an fè yon depo": "Quand le client fait un dépôt", "Nan yon dat": "À une date", "Kreye alèt la": "Créer l'alerte", "Rekouvreman": "Recouvrement", "Kliyan an dwe": "Le client doit", "Fè l peye anvan l ale pi lwen.": "Faites-le payer avant d'aller plus loin.", "Fèmen l": "Fermer", "Rezoud otomatik": "Résolue automatiquement", "Alèt sistèm · li disparèt lè kliyan an peye sa l dwe a": "Alerte système · disparaît quand le client a payé ce qu'il doit", "Manadjè": "Manager", "Fèmen pa yon manadjè": "Fermée par un manager", "Fèmen lè kliyan an pa an reta ankò": "Se ferme quand le client n'est plus en retard", "Fèmen lè kliyan an fè yon depo": "Se ferme au prochain dépôt", "Fèmen nan dat": "Se ferme le", "Pa gen alèt sou kliyan sa a.": "Aucune alerte sur ce client.", "Alèt la kreye.": "Alerte créée.", "Fèmen alèt la?": "Fermer l'alerte ?", "Ajan yo p ap wè l ankò.": "Les agents ne la verront plus.", "Alèt la fèmen.": "Alerte fermée.", "alèt sou kliyan sa a": "alertes sur ce client", "Alèt sou kliyan sa a": "Alerte sur ce client", "Son alèt yo": "Son des alertes", "Wi": "Oui", "Non": "Non", "pou rekipere": "à récupérer", "vèsman (1)": "versement (1)", "Mwa a": "Ce mois-ci", "Kòb ki dwe pou mwa a, poko rantre": "Dû pour le mois, pas encore encaissé", "kliyan pou ale fè peye": "clients à faire payer", "Okenn kliyan pa dwe": "Aucun client en retard", "li desann lè yo peye, li monte lè yo rate": "baisse quand ils paient, monte quand ils manquent", "Te dwe peye jiska jodi a": "Dû jusqu'à aujourd'hui", "sou": "sur", "pou tout mwa a": "pour tout le mois", "Rantre sou plan": "Encaissé sur les plans", "nan sa ki te dwe a": "de ce qui était dû", "Total kolekte nan mwa a": "Total collecté ce mois-ci", "tout depo": "tous les dépôts", "Wè kliyan ki an reta yo": "Voir les clients en retard", "Pou kolekte jodi a": "À collecter aujourd'hui", "kliyan dwe peye": "clients doivent payer", "Kolekte sou plan": "Collecté sur les plans", "kliyan peye": "clients ont payé", "Rete pou kolekte": "Reste à collecter", "kliyan poko peye": "clients n'ont pas encore payé", "Tout moun peye": "Tout le monde a payé", "objektif la rive": "de l'objectif atteint", "Total kolekte jodi a": "Total collecté aujourd'hui", "(tout depo)": "(tous les dépôts)", "ladan l": "dont", "anplis plan yo": "au-delà des plans", "Lòt ajan": "Autre agent",
  "Kont": "Compte", "Modifye": "Modifier", "Tranzaksyon yo": "Transactions", "Pa afekte kach la": "Sans effet sur la caisse",
  "Tranzaksyon mwen yo": "Mes transactions", "balans deklare": "solde déclaré", "depo": "dépôts",
  "tranzaksyon poko voye: yo konte nan rapò a, men sèvè a poko resevwa yo.": "transaction(s) non envoyée(s) : comptées dans le rapport, mais pas encore reçues par le serveur.",
  "Pa gen tranzaksyon": "Aucune transaction",
  // Paramèt
  "Kont mwen": "Mon compte", "Wòl": "Rôle", "Ajan": "Agent", "Manadjè": "Manager", "Admin": "Admin", "Anplwaye": "Employé",
  "Aparans": "Apparence", "Tèm": "Thème", "Otomatik": "Automatique", "Klè": "Clair", "Fonse": "Sombre",
  "Gwosè tèks": "Taille du texte", "Nòmal": "Normale", "Gwo": "Grande", "Pi gwo": "Très grande", "Lang": "Langue",
  "Koneksyon": "Connexion", "Anliy": "En ligne", "Offline": "Hors ligne", "Dènye senk": "Dernière synchro",
  "Dènye telechajman": "Dernier téléchargement", "jamè": "jamais", "Senkronize kounye a": "Synchroniser maintenant",
  "Konekte ankò": "Se reconnecter", "pou voye done yo.": "pour envoyer les données.", "Sesyon w fini.": "Session expirée.",
  "Tout bagay voye ✓": "Tout est envoyé ✓", "Eseye ankò": "Réessayer", "Efase": "Supprimer", "Dekonekte": "Se déconnecter",
  "Administrasyon": "Administration", "Jere ajan yo": "Gérer les agents", "Ajan yo": "Agents", "Nouvo ajan": "Nouvel agent",
  "Kreye kont lan": "Créer le compte", "Nouvo modpas": "Nouveau mot de passe", "Dezaktive": "Désactiver", "Reaktive": "Réactiver",
  "Pa gen ajan.": "Aucun agent.", "Fòk ou gen entènèt pou jere ajan yo.": "Une connexion internet est requise pour gérer les agents.",
  "Modpas la chanje.": "Mot de passe modifié.", "Modpas la dwe gen omwen 8 karaktè.": "Le mot de passe doit avoir au moins 8 caractères.",
  "Mete non moun nan.": "Indiquez le nom de la personne.", "Telefòn nan dwe gen 8 chif.": "Le téléphone doit avoir 8 chiffres.",
  "Senkronizasyon fini ✓": "Synchronisation terminée ✓", "Pa gen koneksyon.": "Pas de connexion.", "Konekte ankò.": "Reconnectez-vous.",
  "Pa gen koneksyon entènèt.": "Pas de connexion internet.", "Nouvo vèsyon disponib · Peze pou rechaje": "Nouvelle version disponible · Touchez pour recharger",
  "vèsyon": "version", "Retounen": "Retour", "Ap chaje…": "Chargement…", "Kliyan (ajoute)": "Client (ajouté)",
  "Anile": "Annuler", "Konfime": "Confirmer", "Wi": "Oui", "Kontinye": "Continuer",
  // Popup
  "Ajoute kliyan sa a nan Grandon?": "Ajouter ce client à Grandon ?",
  "Kreye cycle Grandon sa a?": "Créer ce cycle Grandon ?", "Montan an pi piti pase plan an": "Montant inférieur au plan",
  "Efase operasyon sa a?": "Supprimer cette opération ?",
  "Operasyon sa a ak tout sa ki depann de li ap efase. Sa p ap ka defèt.": "Cette opération et tout ce qui en dépend seront supprimés. Action irréversible.",
  "Dekonekte?": "Se déconnecter ?", "Done yo ap efase sou telefòn nan.": "Les données seront effacées du téléphone.",
  "Gen operasyon ki poko voye": "Des opérations ne sont pas envoyées", "Senkronize yo anvan w dekonekte.": "Synchronisez-les avant de vous déconnecter.",
  "Dezaktive kont sa a?": "Désactiver ce compte ?", "Ajan an p ap ka konekte ankò.": "L'agent ne pourra plus se connecter.",
  "omwen 8 karaktè": "au moins 8 caractères", "Kliyan sa a deja egziste?": "Ce client existe déjà ?",
  "gen menm telefòn lan.": "a le même téléphone.", "Kreye yon lòt kanmenm": "Créer quand même",
  // Chan obligatwa
  "8 chif": "8 chiffres", "ri, mache, zòn": "rue, marché, zone", "Chan sa yo obligatwa": "Champs obligatoires",
  "Foto kliyan an": "Photo du client",
  // Epay: onglè, frè, viman, otorizasyon, fidbak
  "Validasyon": "Validation", "Frè": "Frais", "Viman": "Virement", "Viman voye": "Virement envoyé", "Viman resevwa": "Virement reçu",
  "Retrè peye": "Retraits payés", "retrè": "retraits", "retrè / viman": "retraits / virements", "pa afekte kach la": "sans effet sur la caisse",
  "frè ak viman pa ladan l": "frais et virements exclus", "Kliyan ki pa peye": "Clients n'ayant pas payé", "fidbak anrejistre": "retours enregistrés",
  "Demann an atant": "Demandes en attente", "Demann retrè ak viman": "Demandes de retrait et virement", "Demann": "Demande",
  "An atant otorizasyon": "En attente d'autorisation", "Apwouve": "Approuvé", "Refize demann sa a?": "Refuser cette demande ?",
  "Rezon refi a": "Motif du refus", "Rezon": "Motif", "Apwouve retrè sa a?": "Approuver ce retrait ?", "Apwouve viman sa a?": "Approuver ce virement ?",
  "Kont ki resevwa": "Compte bénéficiaire", "Kont ki resevwa viman an": "Compte qui reçoit le virement", "Balans kont lan": "Solde du compte", "Balans": "Solde",
  "Demann lan apwouve.": "Demande approuvée.", "Demann lan refize.": "Demande refusée.", "Demann lan voye bay manadjè a.": "Demande envoyée au manager.",
  "Pa gen demann an atant.": "Aucune demande en attente.", "Voye demann lan": "Envoyer la demande",
  "Retrè ak viman yo bezwen otorizasyon yon manadjè. Lè ou apwouve, ekriti yo pase touswit sou kont yo.": "Retraits et virements exigent l'autorisation d'un manager. Une fois approuvés, les écritures sont passées immédiatement.",
  "Sa a bezwen otorizasyon yon manadjè. Peye kliyan an sèlman lè demann lan apwouve.": "Cette opération exige l'autorisation d'un manager. Ne payez le client qu'après approbation.",
  "Fòk ou gen entènèt pou otorize yon demann.": "Une connexion internet est requise pour autoriser une demande.",
  "Tip frè": "Type de frais", "Chwazi tip frè a.": "Choisissez le type de frais.", "Chwazi kont ki resevwa viman an.": "Choisissez le compte bénéficiaire.",
  "Frè a soti sou kont kliyan an. Li pa afekte kach ou.": "Les frais sont prélevés sur le compte du client, sans effet sur votre caisse.",
  "Kòb la ap soti sou kont sa a pou l antre sou lòt kont lan.": "Le montant sort de ce compte pour entrer sur l'autre compte.",
  "Frè a anrejistre.": "Frais enregistrés.", "Balans kanè a avan": "Solde du carnet avant", "Balans kanè avan an pa koresponn ak dènye kanè a": "Le solde avant ne correspond pas au dernier carnet", "Kontinye kanmenm": "Continuer quand même", "Verifye ou pa chanje plas montan an ak balans kanè avan an.": "Vérifiez que vous n'avez pas inversé le montant et le solde avant.", "Verifye kanè kliyan an ak montan an.": "Vérifiez le carnet du client et le montant.", "Dènye balans kanè": "Dernier solde du carnet", "Balans avan ou mete": "Solde avant saisi", "dènye kanè": "dernier carnet", "Balans kanè a avan (oto)": "Solde du carnet avant (auto)", "Balans kanè a dwe vin (oto)": "Le carnet doit devenir (auto)", "Balans kanè a apre": "Solde du carnet après",
  "kanè avan": "carnet avant", "kanè apre": "carnet après", "Pa peye": "N'a pas payé", "Pa peye · Fidbak": "Non payé · Retour",
  "Kliyan an pa peye": "Le client n'a pas payé", "Nòt (opsyonèl)": "Note (facultatif)", "Fidbak la anrejistre.": "Retour enregistré.",
  "Fidbak anrejistre": "Retour enregistré", "Fidbak": "Retours", "Kliyan an di pou m repase": "Le client demande de repasser",
  "Kliyan an pa la jodi a": "Le client est absent aujourd'hui", "Kliyan an di li pa gen kòb jodi a": "Le client dit ne pas avoir d'argent aujourd'hui",
  "Kliyan an refize peye": "Le client refuse de payer", "Biznis la fèmen": "Commerce fermé", "Kliyan an malad": "Le client est malade", "Lòt rezon": "Autre motif",
  "Vèsman prevwa": "Versements prévus", "Total pou l sanble": "Total à épargner", "san dimanch ni jou ferye": "hors dimanches et jours fériés",
  "Vèsman fèt": "Versements effectués", "depo ou wè sou telefòn nan": "dépôts visibles sur le téléphone", "vèsman": "versements",
  "Jou ferye": "Jours fériés", "Pwochen jou ferye yo": "Prochains jours fériés", "Jou ki pase yo": "Jours passés", "Non jou a": "Nom du jour",
  "Ajoute jou a": "Ajouter le jour", "Dat": "Date", "Pa gen jou ferye.": "Aucun jour férié.", "Jou ferye a ajoute.": "Jour férié ajouté.",
  "Efase jou ferye sa a?": "Supprimer ce jour férié ?", "Jou sa a deja nan lis la.": "Ce jour est déjà dans la liste.",
  "Dimanch ak jou sa yo pa konte nan vèsman prevwa yo.": "Les dimanches et ces jours ne comptent pas dans les versements prévus.",
  "Mete dat la ak non jou a.": "Indiquez la date et le nom du jour.", "Mwen": "Moi", "Dimanch pa yon jou peman": "Le dimanche n'est pas un jour de paiement",
  "Retrè ak viman bezwen otorizasyon manadjè: fè yon demann.": "Retraits et virements exigent l'autorisation d'un manager : faites une demande.",
  "Se yon manadjè ki ka otorize retrè ak viman.": "Seul un manager peut autoriser retraits et virements.",
  "Frè a ap tann depo yo valide (balans valide a poko ase). L ap reeseye otomatikman.": "Les frais attendent la validation des dépôts (solde validé insuffisant). Nouvel essai automatique.",
  "An atant": "En attente",
  // Look / Paramèt
  "Look": "Style", "aparans aplikasyon an": "apparence de l'application", "Look sa a toujou fonse.": "Ce style est toujours sombre.",
  "An reta": "En retard", "Tout": "Tous", "Filt": "Filtre", "peman jodi a": "paiements du jour", "kolekte": "collectés",
  "Kolekte jodi a": "Collecté aujourd'hui", "Kolekte": "Collecté", "Peye": "Payés", "kliyan rete pou w wè": "clients restent à voir",
  "Pou wè jodi a": "À voir aujourd'hui", "Semèn sa a": "Cette semaine", "Jou peye": "Jours payés", "Rele": "Appeler", "Kat": "Carte",
  "Cycle aktif": "Cycle actif", "Objektif": "Objectif", "Vèsman": "Versements", "semèn konplè": "semaine complète", "pasyèl": "partielle",
  "13 dènye semèn": "13 dernières semaines", "Kolèk pa lè": "Collecte par heure", "Swivi kliyan yo": "Suivi des clients", "poko wè": "pas encore vus",
  "Kach pou remèt nan kès": "Espèces à remettre à la caisse", "depo ou wè sou telefòn nan": "dépôts visibles sur le téléphone",
  "Repase demen": "Repasser demain", "Pa la": "Absent", "Pa gen kòb": "Pas d'argent", "Fèmen": "Fermé", "Malad": "Malade", "Repase": "Repasser",
  "jou": "jours", "retire": "retirés", "vèsman peye": "versements payés", "an reta": "en retard", "Nouvo cycle": "Nouveau cycle",
  // Idantite
  "Pseudo": "Pseudo", "non yo konnen l": "surnom", "Dat nesans": "Date de naissance", "Pyès idantifikasyon": "Pièce d'identification",
  "Nimewo idantifikasyon": "Numéro d'identification", "Mete nimewo pyès la.": "Indiquez le numéro de la pièce.",
  "Kliyan an dwe gen omwen 16 an.": "Le client doit avoir au moins 16 ans.", "Verifye nimewo pyès la": "Vérifiez le numéro de la pièce",
  "Yon NIF dwe gen 10 chif (000-000-000-0).": "Un NIF doit avoir 10 chiffres (000-000-000-0).", "Yon CIN dwe gen 10 chif.": "Une CIN doit avoir 10 chiffres.",
  "Yon nimewo paspò dwe gen 6 a 12 lèt oswa chif.": "Un numéro de passeport doit avoir 6 à 12 lettres ou chiffres.",
  "Korije": "Corriger", "Nimewo pyès": "Numéro de pièce", "deja anrejistre pou yon lòt kliyan.": "déjà enregistré pour un autre client.",
  "Dat nesans lan pa bon": "Date de naissance invalide",
  // Jou
  "Lendi": "Lundi", "Madi": "Mardi", "Mèkredi": "Mercredi", "Jedi": "Jeudi", "Vandredi": "Vendredi", "Samdi": "Samedi", "Dimanch": "Dimanche",
  "Len": "Lun", "Mad": "Mar", "Mèk": "Mer", "Jed": "Jeu", "Van": "Ven", "Sam": "Sam", "Dim": "Dim",
  "mwa": "mois", "jou": "jours", "fwa": "fois",
  // Erè sèvè yo (RPC)
  "Telefòn": "Téléphone", "deja anrejistre pou": "déjà enregistré pour", "Verifye nimewo a.": "Vérifiez le numéro.",
  "Plizyè kliyan gen telefòn": "Plusieurs clients ont le téléphone", "Chèche kliyan an nan lis la.": "Cherchez le client dans la liste.",
  "Dire a dwe ant 2 ak 6 mwa.": "La durée doit être entre 2 et 6 mois.",
  "Frekans lan dwe 1, 2, 3 oswa 6 fwa pa semèn.": "La fréquence doit être 1, 2, 3 ou 6 fois par semaine.",
  "pa nan lis plan Grandon yo.": "n'est pas dans la liste des plans Grandon.", "Kont Grandon an pa jwenn.": "Compte Grandon introuvable.",
  "Ou pa gen dwa": "Vous n'avez pas le droit de",
  "Mete balans kanè a avan.": "Indiquez le solde du carnet avant.", "Mete balans kanè a apre.": "Indiquez le solde du carnet après.",
  "Pi resan anvan": "Plus récentes d'abord", "Pi ansyen anvan": "Plus anciennes d'abord", "Montan pi gwo": "Montant le plus élevé", "Montan pi piti": "Montant le plus bas",
  "Kliyan (A → Z)": "Client (A → Z)", "Tout tip": "Tous les types", "Tout eta": "Tous les statuts", "Valide": "Valider", "Valide ✓": "Validé ✓", "Rejte": "Rejeter", "Rejte ✗": "Rejeté ✗", "Triye pa": "Trier par", "Eta": "Statut",
  "Montre plis": "Afficher plus", "Tip": "Type", "tranzaksyon": "transaction(s)", "Yè": "Hier", "Chèche kliyan oswa nimewo kont…": "Rechercher un client ou un numéro de compte…", "Poko gen tranzaksyon.": "Aucune transaction pour l'instant.",
  "Priyorite (jodi a anvan)": "Priorité (aujourd'hui d'abord)", "Dènye depo (pi resan)": "Dernier dépôt (plus récent)", "Dènye depo (pi ansyen)": "Dernier dépôt (plus ancien)",
  "Pi plis pou rekipere": "Plus gros retard à récupérer", "Plan pi gwo": "Plan le plus élevé", "Pwogrè pi ba": "Progression la plus faible",
  "Pa gen depo": "Aucun dépôt", "Dènye depo": "Dernier dépôt", "yè": "hier", "Peman jodi a · poko peye": "Paiement aujourd'hui · pas encore payé",
  "Lòt kont aktif": "Autres comptes actifs", "pou kolekte": "à collecter", "kont": "compte(s)", "Poko peye": "Pas encore payé",
  "fidbak": "retour(s)", "pa kote kliyan an": "pas chez le client", "Rezon": "Motif", "Tout rezon": "Tous les motifs", "Kote": "Lieu",
  "Pa kote kliyan an": "Pas chez le client",
  // Responsab kès
  "Responsab kès": "Responsable de caisse", "Kès": "Caisse", "Depo pou resevwa": "Dépôts à recevoir", "depo an atant": "dépôt(s) en attente", "an atant": "en attente",
  "Retrè ak viman": "Retraits et virements", "tranzaksyon an atant": "transaction(s) en attente", "Ajan": "Agent", "Tout ajan yo": "Tous les agents",
  "Istorik": "Historique", "Chwazi": "Sélectionner", "Chwazi tout": "Tout sélectionner", "Chwazi tout depo": "Sélectionner tous les dépôts de", "depo": "dépôt(s)",
  "chwazi": "sélectionné(s)", "Pa gen depo an atant validasyon.": "Aucun dépôt en attente de validation.", "desizyon": "décision(s)", "valide": "validé",
  "Pa gen desizyon nan 7 dènye jou yo.": "Aucune décision ces 7 derniers jours.", "Pa gen demann retrè oswa viman an atant.": "Aucune demande de retrait ou de virement en attente.",
  "Ajan an mande pou modifye oswa anile yon tranzaksyon. Se ou sèlman ki ka bay otorizasyon an.": "L'agent demande à modifier ou annuler une transaction. Vous seul pouvez donner l'autorisation.",
  "Pa gen demann modifikasyon tranzaksyon an atant.": "Aucune demande de modification de transaction en attente.",
  "Valide depo sa a?": "Valider ce dépôt ?", "Ou konfime ou resevwa kach la. Balans kont kliyan yo ap monte touswit.": "Vous confirmez avoir reçu le cash. Le solde des clients augmente immédiatement.",
  "Rejte depo sa a": "Rejeter ce dépôt", "depo valide": "dépôt(s) validé(s)", "depo rejte": "dépôt(s) rejeté(s)", "te deja trete": "déjà traité(s)",
  "Fòk ou gen entènèt pou valide oswa rejte depo yo.": "Il faut Internet pour valider ou rejeter les dépôts.", "Total": "Total",
  "Dat": "Date", "Detay chak ribrik": "Détail de chaque rubrique", "Anyen.": "Rien.", "Demann retrè ak viman": "Demandes de retrait et virement",
  "Balans deklare": "Solde déclaré", "Demann lan voye bay responsab kès la.": "La demande a été envoyée au responsable de caisse.",
  "Responsab kès la poko reponn demann ou an pou tranzaksyon sa a.": "Le responsable de caisse n'a pas encore répondu à votre demande pour cette transaction.",
  "Sa a bezwen otorizasyon responsab kès la. Peye kliyan an sèlman lè demann lan apwouve.": "Ceci nécessite l'autorisation du responsable de caisse. Ne payez le client qu'une fois la demande approuvée.",
  "Demann modifikasyon fich kliyan yo. Depo, retrè, viman ak modifikasyon tranzaksyon yo ale kay responsab kès la.": "Demandes de modification des fiches clients. Dépôts, retraits, virements et modifications de transactions vont au responsable de caisse.",
  "Peze sou yon tranzaksyon pou mande otorizasyon pou modifye oswa anile l.": "Touchez une transaction pour demander l'autorisation de la modifier ou de l'annuler.",
  "Modifikasyon dirèk responsab kès": "Modification directe du responsable de caisse",
  "Balans kont": "Le solde du compte", "ta vin negatif": "deviendrait négatif", "Balans disponib": "Solde disponible",
  "Balans valide": "Solde validé", "Depo poko valide (pa konte)": "Dépôts non validés (non comptés)", "Lòt demann an atant": "Autres demandes en attente",
  "Disponib pou retrè": "Disponible pour retrait",
  "Balans valide a pa ase pou montan sa a: sèvè a ap refize l. Valide depo ki an atant yo anvan si kliyan an te vrèman bay kòb la.": "Le solde validé ne suffit pas pour ce montant : le serveur le refusera. Validez d'abord les dépôts en attente si le client a vraiment versé l'argent.",
  "Se sèlman kòb responsab kès la deja valide ki ka retire: depo ki poko valide pa konte.": "Seul l'argent déjà validé par le responsable de caisse peut être retiré : les dépôts non validés ne comptent pas.",
  "Kont lan pa gen ase kòb ki valide pou retrè sa a. Se sèlman depo responsab kès la deja valide ki ka retire.": "Le compte n'a pas assez d'argent validé pour ce retrait. Seuls les dépôts déjà validés par le responsable de caisse peuvent être retirés.",
  "Kont lan pa gen ase kòb ki valide pou viman sa a. Se sèlman depo responsab kès la deja valide ki ka retire.": "Le compte n'a pas assez d'argent validé pour ce virement. Seuls les dépôts déjà validés par le responsable de caisse peuvent être retirés.",
  "Modifye cycle a": "Modifier le cycle", "Modifye cycle a?": "Modifier le cycle ?", "Anrejistre modifikasyon an": "Enregistrer la modification",
  "Cycle sa a pa gen frekans ni jou peman: kalandriye peman an vid. Peze «Modifye cycle a» pou mete yo.": "Ce cycle n'a ni fréquence ni jours de paiement : le calendrier de paiement est vide. Touchez « Modifier le cycle » pour les ajouter.",
  "Sa chanje kalandriye peman an, vèsman prevwa yo ak reta yo. Tranzaksyon yo ak balans lan pa chanje.": "Cela change le calendrier de paiement, les versements prévus et les retards. Les transactions et le solde ne changent pas.",
  "Plan aktyèl la": "Le plan actuel", "pa nan lis plan Grandon yo: chwazi youn.": "n'est pas dans la liste des plans Grandon : choisissez-en un.",
  "Egz.: enfòmasyon cycle la te manke": "Ex. : les informations du cycle manquaient", "Chwazi dire a (1 a 12 mwa).": "Choisissez la durée (1 à 12 mois).",
  "Dat kòmansman an pa bon.": "La date de début n'est pas valide.", "Fòk ou gen entènèt pou modifye yon cycle.": "Il faut Internet pour modifier un cycle.",
  "Cycle la modifye ✓": "Cycle modifié ✓", "Pa gen anyen ki chanje.": "Rien n'a changé.", "Dat kòmansman": "Date de début", "Dire": "Durée", "semèn": "semaine",
  "Se manadjè oswa admin sèlman ki ka modifye yon cycle.": "Seul un manager ou un admin peut modifier un cycle.",
  "Ekip": "Équipe", "Ekip la · jodi a": "L'équipe · aujourd'hui", "Wè tout": "Tout voir", "San ajan": "Sans agent", "Done ajan sa a sèlman": "Données de cet agent uniquement",
  "Kont ajan an": "Comptes de l'agent", "peye": "payé(s)", "Chif jodi a pou chak ajan. Peze sou yon ajan pou wè Tablo li ak kont li yo sèlman.": "Chiffres du jour pour chaque agent. Touchez un agent pour voir son tableau de bord et ses comptes uniquement.",
  "Pou kolekte jodi a": "À collecter aujourd'hui", "Kolekte sou plan yo": "Collecté sur les plans", "Total kolekte": "Total collecté", "ajan": "agent(s)", "objektif la": "de l'objectif",
  "depo an atant validasyon": "dépôt(s) en attente de validation", "Kont ki pa atache ak okenn ajan": "Comptes rattachés à aucun agent", "Pa gen depo jodi a": "Aucun dépôt aujourd'hui",
  "Pou kolekte": "À collecter", "Kolekte (plan)": "Collecté (plans)", "Rete": "Reste", "Kliyan peye": "Clients payés", "Poko wè": "Pas encore vus", "Depo an atant": "Dépôts en attente",
  "Mwa a: dwe": "Mois : dû", "Pa gen ajan teren.": "Aucun agent de terrain.",
  "Chanje wòl": "Changer le rôle", "Wòl kounye a": "Rôle actuel", "Se ou (ou pa ka chanje pwòp wòl ou)": "C'est vous (vous ne pouvez pas changer votre propre rôle)",
  "Kont kliyan li yo ap rete atache avè l, men yo p ap parèt sou non l nan Ekip la toutotan li pa ajan.": "Ses comptes clients restent rattachés à lui, mais n'apparaîtront pas à son nom dans l'Équipe tant qu'il n'est pas agent.",
  "Nouvo wòl la ap aplike sou aplikasyon li nan pwochen senkronizasyon an.": "Le nouveau rôle s'appliquera sur son application à la prochaine synchronisation.",
  "Wòl ou chanje": "Votre rôle a changé", "Ou pa ka chanje pwòp wòl ou.": "Vous ne pouvez pas changer votre propre rôle.", "Fòk gen omwen yon admin aktif.": "Il faut au moins un admin actif.",
  "Manadjè": "Manager", "Ajan": "Agent",
  // Modpas ak aparèy
  "Chanje modpas mwen": "Changer mon mot de passe", "Chwazi pwòp modpas ou": "Choisissez votre mot de passe",
  "Modpas ou resevwa a se yon modpas tanporè. Chwazi yon modpas pa w anvan w kontinye: se ou sèl ki pou konnen l.": "Le mot de passe reçu est temporaire. Choisissez votre propre mot de passe avant de continuer : vous seul devez le connaître.",
  "Ansyen modpas": "Ancien mot de passe", "Nouvo modpas": "Nouveau mot de passe", "(omwen 8 karaktè)": "(au moins 8 caractères)",
  "Konfime nouvo modpas la": "Confirmez le nouveau mot de passe", "Fòk ou gen entènèt pou chanje modpas.": "Il faut Internet pour changer le mot de passe.",
  "De modpas yo pa menm.": "Les deux mots de passe ne correspondent pas.", "Modpas ou chanje ✓": "Mot de passe changé ✓",
  "Ansyen modpas la pa bon.": "L'ancien mot de passe est incorrect.", "Nouvo modpas la dwe diferan de ansyen an.": "Le nouveau mot de passe doit être différent de l'ancien.",
  "Modpas sa a twò fasil. Chwazi yon lòt.": "Ce mot de passe est trop faible. Choisissez-en un autre.", "Modpas la dwe gen omwen 8 karaktè.": "Le mot de passe doit avoir au moins 8 caractères.",
  "Ansyen aparèy ou a dekonekte.": "Votre ancien appareil a été déconnecté.",
  "Kont ou konekte sou yon lòt aparèy": "Votre compte est connecté sur un autre appareil", "Kont ou debloke": "Votre compte a été débloqué",
  "Ou konekte sou yon lòt aparèy. Pou sekirite, yon sèl aparèy ka aktif an menm tan: aparèy sa a dekonekte.": "Vous vous êtes connecté sur un autre appareil. Par sécurité, un seul appareil peut être actif à la fois : cet appareil est déconnecté.",
  "Yon manadjè debloke kont ou pou w ka konekte sou yon lòt aparèy. Aparèy sa a pa aktif ankò.": "Un manager a débloqué votre compte pour que vous puissiez vous connecter sur un autre appareil. Cet appareil n'est plus actif.",
  "operasyon poko voye sou aparèy sa a. Yo pa efase: konekte ankò sou aparèy sa a pou voye yo.": "opération(s) non envoyée(s) sur cet appareil. Elles ne sont pas effacées : reconnectez-vous sur cet appareil pour les envoyer.",
  "Konekte ankò sou aparèy sa a": "Se reconnecter sur cet appareil",
  "operasyon poko voye sou": "opération(s) non envoyée(s) sur", "Voye yo sou aparèy sa a anvan, oswa mande yon manadjè debloke w.": "Envoyez-les d'abord depuis cet appareil, ou demandez à un manager de vous débloquer.",
  "ansyen aparèy la": "l'ancien appareil",
  "Aparèy ajan yo": "Appareils des agents", "Yon ajan ka aktif sou yon sèl aparèy. Si telefòn li pèdi oswa kraze, debloke l pou l ka konekte sou yon lòt.": "Un agent ne peut être actif que sur un seul appareil. Si son téléphone est perdu ou cassé, débloquez-le pour qu'il puisse se connecter sur un autre.",
  "Fòk ou gen entènèt pou wè aparèy yo.": "Il faut Internet pour voir les appareils.", "Libere": "Libéré", "Poko konekte": "Jamais connecté",
  "Pwochen koneksyon an lib.": "La prochaine connexion est libre.", "Aparèy": "Appareil", "Dènye fwa": "Vu le", "Debloke": "Débloquer",
  "Debloke ajan sa a?": "Débloquer cet agent ?", "aparèy aktif la ap dekonekte, epi ajan an ap ka konekte sou yon nouvo aparèy.": "l'appareil actif sera déconnecté et l'agent pourra se connecter sur un nouvel appareil.",
  "operasyon poko voye sou ansyen aparèy la: yo ap pèdi si aparèy sa a pa janm reparèt.": "opération(s) non envoyée(s) sur l'ancien appareil : elles seront perdues si cet appareil ne réapparaît jamais.",
  "Ajan an debloke ✓": "Agent débloqué ✓", "Se manadjè sèlman ki ka debloke yon ajan.": "Seul un manager peut débloquer un agent.",
};
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
let RE = null;
// Fraz kout (yon sèl mo) ranplase sèlman lè yo se yon mo antye.
function konpile() {
  const keys = Object.keys(FR).sort((a, b) => b.length - a.length);
  RE = new RegExp(keys.map((k) => (/^[\p{L}-]+$/u.test(k) ? `(?<![\\p{L}])${esc(k)}(?![\\p{L}])` : esc(k))).join("|"), "gu");
}
konpile();
// Modil yo (look-a/b/c.js…) ka ajoute pwòp tradiksyon yo. Fraz ki deja la yo pa ranplase.
export function addTranslations(map) {
  let n = 0;
  for (const [k, v] of Object.entries(map || {})) if (FR[k] === undefined && typeof v === "string") { FR[k] = v; n++; }
  if (n) konpile();
}

let lang = "ht";
try { lang = localStorage.getItem("grandon-lang") || "ht"; } catch { /* navigatè prive */ }
export const getLang = () => lang;
export function setLang(l) {
  lang = l === "fr" ? "fr" : "ht";
  try { localStorage.setItem("grandon-lang", lang); } catch { /* */ }
  document.documentElement.lang = lang;
}
document.documentElement.lang = lang;

// Non mak sit la (config NON). Tèks aplikasyon an ekri ak «Grandon»: sou yon lòt sit, non an ranplase.
const MAK = (typeof window !== "undefined" && window.GRANDON_CONFIG?.NON) || "Grandon";
const markOk = MAK === "Grandon";
const mak = (str) => (markOk ? str : str.replace(/Grandon/g, MAK));
export function t(s) {
  if (s == null || (lang !== "fr" && markOk)) return s;
  const str = String(s);
  if (lang !== "fr") return mak(str);
  if (FR[str.trim()] !== undefined) return mak(str.replace(str.trim(), FR[str.trim()]));
  return mak(str.replace(RE, (m) => FR[m] ?? m));
}

const ATTRS = ["placeholder", "aria-label", "title", "alt"];
function traduireNoeud(root) {
  if ((lang !== "fr" && markOk) || !root) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest("script,style,[data-brut]") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes = [];
  while (w.nextNode()) nodes.push(w.currentNode);
  for (const n of nodes) { const v = t(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
  const els = root.nodeType === 1 ? [root, ...root.querySelectorAll("[placeholder],[aria-label],[title],[alt]")] : [];
  for (const el of els) for (const a of ATTRS) if (el.hasAttribute?.(a)) { const v = t(el.getAttribute(a)); if (v !== el.getAttribute(a)) el.setAttribute(a, v); }
}

// Tradui tout sa ki parèt nan paj la, menm sa ki ajoute apre (rezilta rechèch, toast…).
export function demarrerTraduction() {
  const obs = new MutationObserver((muts) => {
    if (lang !== "fr" && markOk) return;
    obs.disconnect();
    for (const m of muts) {
      if (m.type === "characterData") { const v = t(m.target.nodeValue); if (v !== m.target.nodeValue) m.target.nodeValue = v; }
      for (const n of m.addedNodes) n.nodeType === 3 ? (n.nodeValue = t(n.nodeValue)) : traduireNoeud(n);
    }
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
  traduireNoeud(document.body);
  obs.observe(document.body, { childList: true, subtree: true, characterData: true });
}
