const CsvService = require('../services/CsvService');
const { joinTables } = require('../utils/JoinUtils');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Contrôleur pour gérer l'upload et le traitement des fichiers CSV
class CsvController {

  async handleCsvUpload(req, res) {
    try {
      const { nameOutPut, typeJoin, filterCriteria } = req.body;
      const files = Array.isArray(req.files) ? req.files : [req.files];  // Gestion des fichiers envoyés en tant qu'objet ou tableau
  
      console.log('Body reçu :', req.body);
      console.log('Fichiers reçus :', req.files);
            
      // Validation : vérifier les fichiers et les champs requis
      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'Aucun fichier uploadé.' });
      }
  
      // Vérification des champs requis
      if (files.length > 1 && (!nameOutPut || !typeJoin)) {
        return res.status(400).json({ 
          message: 'Les champs nameOutPut et typeJoin sont obligatoires pour plusieurs fichiers.',
          received: { nameOutPut, typeJoin },
        });
      }

      // Logs pour débogage
      console.log('Fichiers reçus:', files);
      console.log('Champs reçus:', { nameOutPut, typeJoin, filterCriteria });

      // Définir un critère de filtrage par défaut si absent
      const filter = filterCriteria && filterCriteria.trim() !== '' ? JSON.parse(filterCriteria) : {};

      // Appeler le service CSV
      const result = await CsvService.processFiles(files, nameOutPut, typeJoin, filter);

      // Retourner le chemin du fichier CSV final
      res.status(200).json({
        message: result.message,
        finalCsvPath: result.finalCsvPath,
        data: result.data,
      });

    } catch (error) {
      console.error('Erreur lors du traitement des fichiers CSV :', error);
      res.status(500).json({ message: 'Erreur de traitement', error: error.message });
    }
  }
  


  //  Nouvelle méthode pour récupérer les fichiers dans un dossier
  async getUploadedFiles(req, res) {
    const { type } = req.query; // Récupère le type de dossier ("upload" ou "output")
  
    // Définir les chemins pour les deux dossiers
    const uploadDir = path.join(os.tmpdir(), 'uploads');
    const outputDir = path.join(os.tmpdir(), 'output');
  
    try {
      // Fonction pour lister les fichiers d'un dossier
      const listFiles = (directory) => {
        if (!fs.existsSync(directory)) {
          return { error: true, message: `Le dossier ${path.basename(directory)} est introuvable.` };
        }
        const files = fs.readdirSync(directory);
        return { error: false, files };
      };
  
      let response;
  
      if (type === 'upload') {
        // Lister les fichiers dans "uploads"
        response = listFiles(uploadDir);
        if (response.error) {
          return res.status(404).json({ message: response.message });
        }
        return res.status(200).json({ message: 'Fichiers récupérés depuis uploads.', files: response.files });
      }
  
      if (type === 'output') {
        // Lister les fichiers dans "output"
        response = listFiles(outputDir);

        if (response.error) {
          return res.status(404).json({ message: response.message });
        }
        return res.status(200).json({ message: 'Fichiers récupérés depuis output.', files: response.files });
      
      }
  
      if(type === 'tous'){

        // Lister les fichiers dans "output"

        const uploadResponse = listFiles(uploadDir);
        const outputResponse = listFiles(outputDir);
    
        return res.status(200).json({
          message: 'Fichiers récupérés depuis uploads et output.',
          files: {
            uploads: uploadResponse.error ? [] : uploadResponse.files,
            output: outputResponse.error ? [] : outputResponse.files,
          },
        });
      }
      return res.status(400).json({ message: 'Type de dossier invalide.' });

    } catch (error) {
      console.error('Erreur lors de la récupération des fichiers :', error);
      res.status(500).json({
        message: 'Erreur lors de la récupération des fichiers.',
        error: error.message,
      });
    }
  }
  

  // Cette méthode sert un fichier à l'utilisateur pour le télécharger
  async downloadFile(req, res) {
    const { type, fileName } = req.params;  // Récupère le type de dossier (upload/output) et le nom du fichier depuis les paramètres

    // Définir les chemins pour les deux dossiers
    const uploadDir = path.join(os.tmpdir(), 'uploads');
    const outputDir = path.join(os.tmpdir(), 'output');

    // Déterminer le dossier à partir du type
    let directory;
    if (type === 'upload') {
      directory = uploadDir;
      console.log('chemin upload', uploadDir);
    
    } else if (type === 'output') {
      directory = outputDir;
    } else {
      return res.status(400).json({ message: 'Type de dossier invalide. Utilisez "upload" ou "output".' });
    }

    // Construire le chemin absolu du fichier
    const filePath = path.join(directory, fileName);

    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Le fichier n\'existe pas.' });
    }

    // Envoyer le fichier pour le téléchargement
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Erreur lors du téléchargement du fichier:', err);
        return res.status(500).json({ message: 'Erreur lors du téléchargement.' });
      }
    });
  } 

  // Nouvelle méthode pour supprimer un fichier
  async deleteFile(req, res) {
    const { type, fileName } = req.params;
  
    // Définir les chemins pour les deux dossiers
    const uploadDir = path.join(os.tmpdir(), 'uploads');
    const outputDir = path.join(os.tmpdir(), 'output');
  
    // Déterminer le dossier à partir du type
    let directory;
    if (type === 'upload') {
      directory = uploadDir;
    } else if (type === 'output') {
      directory = outputDir;
    } else {
      return res.status(400).json({ message: 'Type de dossier invalide. Utilisez "upload" ou "output".' });
    }
  
    const filePath = path.join(directory, fileName);
  
    try {
      // Vérifier si le fichier existe
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Fichier non trouvé.' });
      }
  
      // Utiliser le service pour supprimer le fichier
      const message = await CsvService.deleteFile(directory, fileName);
  
      res.status(200).json({ message });
    } catch (error) {
      console.error('Erreur lors de la suppression du fichier:', error);
      res.status(500).json({ message: 'Erreur interne du serveur.', error: error.message });
    }
  }
  async url(req, res){

    console.log('aaaaaaa');
    res.status(300).json("dssssss");


  }
}


module.exports = new CsvController();
