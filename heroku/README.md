
git config user.name "Sergio Lopez"
git config user.email "smlgroot@gmail.com"
git commit --amend --reset-author

----------------------------------------------
git subtree push --prefix heroku heroku main

heroku buildpacks:clear # (optional, to start clean)
heroku buildpacks:add --index 1 heroku-community/apt
heroku buildpacks:add --index 2 heroku/python


heroku logs -a orto-pdf-processor
