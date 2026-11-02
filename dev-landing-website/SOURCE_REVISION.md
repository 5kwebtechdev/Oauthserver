# Dev landing page source

This directory vendors the website application source from
`https://github.com/SuperMeApp/SuperMeWebsiteFE`, branch `Abhishek`, commit
`ef2597d946a063aba72723162708317709222491` (2026-10-29).

It is kept inside this Oauthserver branch so the dev landing page can be built
and deployed without a SuperMeWebsiteFE submodule or changes to that repository.
The dev-only build target is `development-apk`; it selects
`src/environments/environment.devapk.ts` for the dev API and app URLs.

When updating the landing page, bring the intended `Abhishek` source changes
into this directory and preserve the dev environment/build target. Do not use
the production website deployment workflow from this copy.
