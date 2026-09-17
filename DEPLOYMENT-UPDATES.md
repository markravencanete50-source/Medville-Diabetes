# September 2026 dashboard and image update

- Dashboard action notices render above the application in a centred, opaque card with their own theme variables.
- The newsletter dialog appears on each fresh page visit, including returning browsers. Dismissing it does not interrupt internal navigation. Eligibility and admin routes are excluded.
- Influencer links support Delete and Restore. Deleted links are inactive, their codes remain reserved, and historical enquiries are retained. Restored links must be reactivated explicitly.
- Basic campaign visits, enquiries and conversion are first-party measurements. They do not need Meta's Marketing API. A Meta Pixel is not activated by this release; the client's numeric Pixel ID is still needed.
- Public images use versioned Cloudinary URLs with automatic format and quality. Original image files remain in source control for recovery but are removed from Hosting builds. Legacy image paths redirect to Cloudinary.

## Server configuration

The `admin` functions codebase requires `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `NOTIFICATION_FROM`, and Secret Manager secrets `CLOUDINARY_API_SECRET` and `RESEND_API_KEY`. Never place the Cloudinary secret in a `VITE_` variable or commit it. The signed `medville_signed_images` upload preset restricts files to image formats and 5 MB. Upload signatures enforce the administrator's content permissions and prevent overwriting assets.

Firebase Authentication's authorized domains must include both `www.medvillediabetes.com` and `medvillediabetes.com`; missing the first prevented invitation password links from being generated. The domain configuration was corrected separately from the code deployment.

## Release checks

Run `npm test`, `npm run build`, and dependency audits for the root, `functions`, and `functions/admin`. The build checks unique metadata and prerendered content. CI also runs Firestore emulator access tests. Deploy changed functions codebases as well as Hosting: the GitHub Hosting workflow alone does not deploy backend changes.

`/release.json` is served without caching and identifies the deployed commit. Compare it with GitHub main after deploying to confirm the custom domain has the new release.
