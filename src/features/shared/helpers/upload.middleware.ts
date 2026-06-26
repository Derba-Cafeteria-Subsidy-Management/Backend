import multer from "multer";

const storage = multer.memoryStorage();

export const uploadExcel = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error("Only Excel files are allowed"));
        }

        cb(null, true);
    },
});