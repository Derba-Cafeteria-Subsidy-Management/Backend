import type { UploadApiResponse } from "cloudinary";
import fs from "fs/promises";
import { cloudinary } from "../../config.js";

type UploadOptions = { folder?: string | undefined; publicId?: string | undefined };

export async function uploadImageFile(
	filePath: string,
	options?: UploadOptions
): Promise<UploadApiResponse> {

    const uploadOptions: Record<string, unknown> = {
		resource_type: "image",
	};

	if (options?.folder) {
		uploadOptions.folder = options.folder;
	}

	if (options?.publicId) {
		uploadOptions.public_id = options.publicId;
	}

	return cloudinary.uploader.upload(filePath, uploadOptions);
}


export async function uploadPrivateImageFile(
	filePath: string,
	options?: UploadOptions
): Promise<UploadApiResponse> {
	const uploadOptions: Record<string, unknown> = {
		resource_type: "image",
		type: "private",
	};

	if (options?.folder) {
		uploadOptions.folder = options.folder;
	}

	if (options?.publicId) {
		uploadOptions.public_id = options.publicId;
	}

	return cloudinary.uploader.upload(filePath, uploadOptions);
}


export async function uploadPrivateImageBuffer(
  buffer: Buffer,
  options?: UploadOptions
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
	const uploadOptions: Record<string, unknown> = {
	  resource_type: "image",
	  type: "private",
	  ...(options?.folder && { folder: options.folder }),
	  ...(options?.publicId && { public_id: options.publicId }),
	};

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error: Error | undefined, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve(result);
      }
    );

    stream.end(buffer);
  });
}


export async function uploadImageBuffer(
	buffer: Buffer,
	options?: UploadOptions
): Promise<UploadApiResponse> {
	return new Promise((resolve, reject) => {
		const uploadOptions: Record<string, unknown> = {
			resource_type: "image",
		};
		if (options?.folder) {
			uploadOptions.folder = options.folder;
		}
		if (options?.publicId) {
			uploadOptions.public_id = options.publicId;
		}

		const stream = cloudinary.uploader.upload_stream(
			uploadOptions,
			(error, result) => {
				if (error || !result) {
					reject(error ?? new Error("Cloudinary upload failed"));
					return;
				}
				resolve(result);
			}
		);

		stream.end(buffer);
	});
}

export async function uploadImageFileAndCleanup(
	filePath: string,
	options?: UploadOptions
): Promise<UploadApiResponse> {
	try {
		return await uploadImageFile(filePath, options);
	} finally {
		await fs.unlink(filePath).catch(() => {});
	}
}

export async function uploadMulterFiles(
	files: Express.Multer.File[],
	options?: { folder?: string }
): Promise<UploadApiResponse[]> {
	return Promise.all(
		files.map((file) => {
			if (file.buffer && file.buffer.length > 0) {
				return uploadImageBuffer(file.buffer, { folder: options?.folder });
			}

			if (file.path) {
				return uploadImageFileAndCleanup(file.path, { folder: options?.folder });
			}

			throw new Error(
				`Unable to upload file '${file.originalname}': missing both buffer and path`
			);
		})
	);
}

export async function deleteCloudinaryAsset(
	publicId: string,
	type: "private" | "upload" = "private"
): Promise<void> {
	await cloudinary.uploader.destroy(publicId, {
		resource_type: "image",
		type,
	});
}
