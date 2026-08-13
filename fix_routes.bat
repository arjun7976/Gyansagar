@echo off
echo Fixing GyanSagar Admin Routing Structure...

:: Move stray folders into the protected group so they get the Admin layout and security.
if exist "app\admin\chapters" robocopy "app\admin\chapters" "app\admin\(protected)\chapters" /E /MOVE
if exist "app\admin\notifications" robocopy "app\admin\notifications" "app\admin\(protected)\notifications" /E /MOVE
if exist "app\admin\question-bank" robocopy "app\admin\question-bank" "app\admin\(protected)\question-bank" /E /MOVE
if exist "app\admin\results" robocopy "app\admin\results" "app\admin\(protected)\results" /E /MOVE
if exist "app\admin\subjects" robocopy "app\admin\subjects" "app\admin\(protected)\subjects" /E /MOVE
if exist "app\admin\topics" robocopy "app\admin\topics" "app\admin\(protected)\topics" /E /MOVE
if exist "app\admin\tests" robocopy "app\admin\tests" "app\admin\(protected)\tests" /E /MOVE

echo Done! Please restart the Next.js development server.
pause
