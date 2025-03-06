#!/bin/bash
npm run build
scp -r dist/ draugmood@raspberrypi.local:/home/draugmood/Software/Calendr
ssh draugmood@raspberrypi.local << 'ENDSSH'
sudo rm -rf /var/www/html/*
sudo cp -r /home/draugmood/Software/Calendr/dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
sudo cmod -R 755 /var/www/html
sudo systemctl reload nginx
ENDSSH