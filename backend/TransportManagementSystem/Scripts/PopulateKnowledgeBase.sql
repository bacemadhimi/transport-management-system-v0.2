-- Knowledge Base for AI Chatbot
-- Run this script to populate initial knowledge

USE TMS;

INSERT INTO KnowledgeBases (Title, Content, Category, Keywords, CreatedAt) VALUES
-- General Procedures
('Commencer le chargement', 'Pour commencer le chargement : 1. Allez dans Suivi GPS, 2. Cliquez sur "Commencer le chargement", 3. Confirmez l''heure de début', 'Procedure', 'chargement,commencer,démarrer,loading', GETDATE()),

('Commencer la livraison', 'Pour commencer la livraison : 1. Allez dans Suivi GPS, 2. Assurez-vous que le chargement est terminé, 3. Cliquez sur "Commencer la livraison"', 'Procedure', 'livraison,commencer,démarrer,delivery', GETDATE()),

('Terminer une mission', 'Pour terminer une mission : 1. Allez dans Suivi GPS, 2. Assurez-vous que toutes les livraisons sont faites, 3. Cliquez sur "Mission terminée"', 'Procedure', 'terminer,finir,mission,complété,completed', GETDATE()),

-- Safety
('Pauses obligatoires', 'Les pauses sont obligatoires toutes les 2 heures de conduite. Durée minimale : 15 minutes. Utilisez l''application pour signaler vos pauses.', 'Safety', 'pause,repos,conduite,sécurité,security', GETDATE()),

('Limitations de vitesse', 'Respectez toujours les limitations de vitesse : 50 km/h en ville, 80 km/h sur route, 130 km/h sur autoroute. La sécurité avant tout !', 'Safety', 'vitesse,limitation,sécurité,security,conduite', GETDATE()),

('En cas d''accident', 'En cas d''accident : 1. Sécurisez la zone, 2. Appelez les secours (112), 3. Contactez le support TMS, 4. Prenez des photos', 'Safety', 'accident,urgence,emergency,sécurité', GETDATE()),

-- FAQ
('Où voir mes livraisons', 'Vos livraisons sont visibles dans l''onglet "Suivi GPS". Vous y verrez la carte avec toutes les destinations.', 'FAQ', 'livraison,voir,consulter,carte,gps', GETDATE()),

('Comment contacter le support', 'Pour contacter le support : 1. Utilisez ce chatbot, 2. Appelez le +216 XX XXX XXX, 3. Envoyez un email à support@tms.com', 'FAQ', 'support,contact,aide,help', GETDATE()),

('Modifier un trajet', 'Un trajet ne peut être modifié que par l''admin. Contactez le support pour toute modification.', 'FAQ', 'modifier,changer,trajet,modification', GETDATE()),

('Consulter historique', 'Votre historique est disponible dans l''onglet "Historique". Vous y verrez tous vos trajets terminés.', 'FAQ', 'historique,ancien,passé,history', GETDATE()),

-- Trip Information
('Heure d''arrivée estimée', 'L''heure d''arrivée est calculée en fonction du trafic et de la distance. Elle est mise à jour en temps réel dans Suivi GPS.', 'Trip', 'heure,arrivée,estimée,temps,distance', GETDATE()),

('Nombre de livraisons', 'Le nombre de livraisons est affiché dans Suivi GPS. Chaque livraison est marquée d''un numéro sur la carte.', 'Trip', 'livraisons,nombre,count,deliveries', GETDATE()),

('Statut du trajet', 'Les statuts possibles : Accepté, En chargement, En livraison, Terminé. Le statut change automatiquement selon vos actions.', 'Trip', 'statut,status,trajet,trip', GETDATE()),

-- Fuel & Maintenance
('Où faire le plein', 'Les stations-service partenaires sont affichées sur la carte. Utilisez l''option "À proximité" dans Suivi GPS.', 'Fuel', 'plein,carburant,fuel,station,essence', GETDATE()),

('Signaler un problème véhicule', 'Pour signaler un problème : 1. Allez dans Véhicules, 2. Sélectionnez votre camion, 3. Cliquez sur "Signaler problème"', 'Maintenance', 'problème,panne,véhicule,camion,maintenance', GETDATE());

PRINT '✅ Knowledge Base populated successfully!';
