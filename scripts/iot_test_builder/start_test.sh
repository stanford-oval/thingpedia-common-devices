#!/bin/bash

echo -e '\r'
echo "Welcome to the Home Assistant Integraton test environment"
echo -e '\r'
directory=$(dirname -- $(readlink -fn -- "$0"))
echo "The script directory is: $directory"
echo -e '\r'
echo "Please choose the options to use:"
echo "- B1: Installation of the test environment"
echo "- B2: Installation of the test env., setup of HA env. by adding the configuration folder"
echo "- B3: Installation of the test env., setup of HA env. by addind the conf. folder, setup IoT devices in HA."
echo "- U1: Update the test env. without configuration (reconfigure manually)"
echo "- U2: Update the test env. by refreshing the conf folder"
echo "- U3: Update the test env. by setting new IoT devices"
echo "- S1: Start the test env. as previously set"
echo "- S2: Start the test env. as previously set without configuration folder"
echo "- S3: Start the test env. as previously set and setting new IoT devices"
echo "- M: Show the help"
echo -e '\r'
read arg1

case $arg1 in
    B1)
        echo -e '\r'
        echo -e "Please enter the path for the testing environment:" 
        read arg2

        if [[ ! -d $arg2 ]]; then
            echo -e '\r'
            echo -e "Attention, the directory doesn't exist, do you want to create it? [(Y)es/(A)bort]"
            read ch_arg2
            if [[ $ch_arg2 == "A" || $ch_arg2 == "a" ]]; then 
                exit
            elif  [[ $ch_arg2  == "Y" || $ch_arg2 == "y" ]]; then
                mkdir $arg2
            else
                echo -e '\r'
                echo -e "Wrong choice"
                exit
            fi
        fi

        echo -e '\r'
        node $directory/init_test_unit.js -B1 -h $arg2
        exit
    ;;
    B2)
        echo -e '\r'
        echo -e "Please enter the path for the testing environment:" 
        read arg2

        if [[ ! -d $arg2 ]]; then
            echo -e '\r'
            echo -e "Attention, the directory doesn't exist, do you want to create it? [(Y)es/(A)bort]"
            read ch_arg2
            if [[ $ch_arg2 == "A" || $ch_arg2 == "a" ]]; then 
                exit
            elif  [[ $ch_arg2  == "Y" || $ch_arg2 == "y" ]]; then
                mkdir $arg2
            else
                echo -e '\r'
                echo -e "Wrong choice"
                exit
            fi
        fi

        echo -e '\r'
        echo -e "Please enter the path for the configuration folder:" 
        read arg3

        if [[ ! -d $arg3 ]]; then
            echo -e '\r'
            echo -e "Attention, the directory doesn't exist, do you want to create it? [(Y)es/(A)bort]"
            read ch_arg3
            if [[ $ch_arg3 == "A" || $ch_arg3 == "a" ]]; then 
                exit
            elif  [[ $ch_arg3  == "Y" || $ch_arg3 == "y" ]]; then
                mkdir $arg3
            else
                echo -e '\r'
                echo -e "Wrong choice"
                exit
            fi
        fi

        echo -e '\r'
        node $directory/init_test_unit.js -B2 -h $arg2 -o $arg3
        exit
    ;;
    B3)
        echo -e '\r'
        echo -e "Please enter the path for the testing environment:" 
        read arg2

        if [[ ! -d $arg2 ]]; then
            echo -e '\r'
            echo -e "Attention, the directory doesn't exist, do you want to create it? [(Y)es/(A)bort]"
            read ch_arg2
            if [[ $ch_arg2 == "A" || $ch_arg2 == "a" ]]; then 
                exit
            elif  [[ $ch_arg2  == "Y" || $ch_arg2 == "y" ]]; then
                mkdir $arg2
            else
                echo -e '\r'
                echo -e "Wrong choice"
                exit
            fi
        fi

        echo -e '\r'
        echo -e "Please enter the path for the configuration folder:" 
        read arg3

        if [[ ! -d $arg3 ]]; then
            echo -e '\r'
            echo -e "Attention, the directory doesn't exist, do you want to create it? [(Y)es/(A)bort]"
            read ch_arg3
            if [[ $ch_arg3 == "A" || $ch_arg3 == "a" ]]; then 
                exit
            elif  [[ $ch_arg3  == "Y" || $ch_arg3 == "y" ]]; then
                mkdir $arg3
            else
                echo -e '\r'
                echo -e "Wrong choice"
                exit
            fi
        fi

        echo -e '\r'
        echo -e "Please enter the path to the Thingpedia devices you want to work with (main/staging/universe):" 
        read arg4

        if [[ ! -d $arg4 ]]; then
            echo -e '\r'
            echo -e "Attention, the directory doesn't exist, do you want to create it? [(Y)es/(A)bort]"
            read ch_arg2
            if [[ $ch_arg4 == "A" || $ch_arg4 == "a" ]]; then 
                exit
            elif  [[ $ch_arg4  == "Y" || $ch_arg4 == "y" ]]; then
                mkdir $arg4
            else
                echo -e '\r'
                echo -e "Wrong choice"
                exit
            fi
        fi

        echo -e '\r'
        echo -e "Do you want to use all the devices in the folder (F) or provide a list (D)?"
        read arg5
        
        echo -e '\r'
        node $directory/init_test_unit.js -B2 -h $arg2 -o $arg3
        node $directory/init_test_unit.js -S1 -h $arg2 &

        if [[ $arg5 == "D" || $arg5  == "d" ]]; then
            echo -e '\r'
            echo -e "Please enter the IoT devices to add to the system (i.e. ['dev1','dev2','devn']):" 
            read arg6
            node $directory/init_test_unit.js -U3 -h $arg2 -d $arg6 $arg4
        else 
            node $directory/init_test_unit.js -U3 -h $arg2 -f $arg4
        fi
                 
        exit
    ;;
    U1)
        echo -e '\r'
        echo -e "Please enter the path for the testing environment:" 
        read arg2

        if [[ ! -d $arg2 ]]; then
            echo -e '\r'
            echo -e "Attention, the directory doesn't exist, do you want to create it? [(Y)es/(A)bort]"
            read ch_arg2
            if [[ $ch_arg2 == "A" || $ch_arg2 == "a" ]]; then 
                exit
            elif  [[ $ch_arg2  == "Y" || $ch_arg2 == "y" ]]; then
                mkdir $arg2
            else
                echo -e '\r'
                echo -e "Wrong choice"
                exit
            fi
        fi

        echo -e '\r'
        echo -e "Please enter the path for the configuration folder:" 
        read arg3

        if [[ ! -d $arg3 ]]; then
            echo -e '\r'
            echo -e "Attention, the directory doesn't exist, do you want to create it? [(Y)es/(A)bort]"
            read ch_arg3
            if [[ $ch_arg3 == "A" || $ch_arg3 == "a" ]]; then 
                exit
            elif  [[ $ch_arg3  == "Y" || $ch_arg3 == "y" ]]; then
                mkdir $arg3
            else
                echo -e '\r'
                echo -e "Wrong choice"
                exit
            fi
        fi

        echo -e '\r'
        node $directory/init_test_unit.js -U1 -h $arg2 -o $arg3
        exit
    ;;
    U2)
        echo -e '\r'
        echo -e "Please enter the path for the testing environment:" 
        read arg2

        if [[ ! -d $arg2 ]]; then
            echo -e '\r'
            echo -e "Attention, the directory doesn't exist, do you want to create it? [(Y)es/(A)bort]"
            read ch_arg2
            if [[ $ch_arg2 == "A" || $ch_arg2 == "a" ]]; then 
                exit
            elif  [[ $ch_arg2  == "Y" || $ch_arg2 == "y" ]]; then
                mkdir $arg2
            else
                echo -e '\r'
                echo -e "Wrong choice"
                exit
            fi
        fi

        echo -e '\r'
        echo -e "Please enter the path for the configuration folder:" 
        read arg3

        if [[ ! -d $arg3 ]]; then
            echo -e '\r'
            echo -e "Attention, the directory doesn't exist, do you want to create it? [(Y)es/(A)bort]"
            read ch_arg3
            if [[ $ch_arg3 == "A" || $ch_arg3 == "a" ]]; then 
                exit
            elif  [[ $ch_arg3  == "Y" || $ch_arg3 == "y" ]]; then
                mkdir $arg3
            else
                echo -e '\r'
                echo -e "Wrong choice"
                exit
            fi
        fi

        echo -e '\r'
        node $directory/init_test_unit.js -U2 -h $arg2 -o $arg3
        exit
    ;;
    U3)
        echo -e '\r'
        echo -e "Please enter the path for the testing environment:" 
        read arg2

        if [[ ! -d $arg2 ]]; then
            echo -e '\r'
            echo -e "Attention, the directory doesn't exist, do you want to create it? [(Y)es/(A)bort]"
            read ch_arg2
            if [[ $ch_arg2 == "A" || $ch_arg2 == "a" ]]; then 
                exit
            elif  [[ $ch_arg2  == "Y" || $ch_arg2 == "y" ]]; then
                mkdir $arg2
            else
                echo -e '\r'
                echo -e "Wrong choice"
                exit
            fi
        fi

        echo -e '\r'
        echo -e "Please enter the path to the Thingpedia devices you want to work with (main/staging/universe):" 
        read arg4

        if [[ ! -d $arg4 ]]; then
            echo -e '\r'
            echo -e "Attention, the directory doesn't exist, do you want to create it? [(Y)es/(A)bort]"
            read ch_arg2
            if [[ $ch_arg4 == "A" || $ch_arg4 == "a" ]]; then 
                exit
            elif  [[ $ch_arg4  == "Y" || $ch_arg4 == "y" ]]; then
                mkdir $arg4
            else
                echo -e '\r'
                echo -e "Wrong choice"
                exit
            fi
        fi

        echo -e '\r'
        echo -e "Do you want to use all the devices in the folder (F) or provide a list (D)?"
        read arg5
        
        echo -e '\r'
        node $directory/init_test_unit.js -S1 -h $arg2 &

        if [[ $arg5 == "D" || $arg5  == "d" ]]; then
            echo -e '\r'
            echo -e "Please enter the IoT devices to add to the system (i.e. ['dev1','dev2','devn']):" 
            read arg6
            node $directory/init_test_unit.js -U3 -h $arg2 -d $arg6 $arg4
        else 
            node $directory/init_test_unit.js -U3 -h $arg2 -f $arg4
        fi
                 
        exit
    ;;
    S1)
        echo -e '\r'
        echo -e "Please enter the path for the testing environment:" 
        read arg2

        if [[ ! -d $arg2 ]]; then
            echo -e '\r'
            echo -e "Attention, the directory doesn't exist, please check the path probided"
            exit
        fi

        echo -e '\r'
        node $directory/init_test_unit.js -S1 -h $arg2 &
        exit
    ;;
    S2)
        echo -e '\r'
        echo -e "Please enter the path for the testing environment:" 
        read arg2

        if [[ ! -d $arg2 ]]; then
            echo -e '\r'
            echo -e "Attention, the directory doesn't exist, do you want to create it? [(Y)es/(A)bort]"
            read ch_arg2
            if [[ $ch_arg2 == "A" || $ch_arg2 == "a" ]]; then 
                exit
            elif  [[ $ch_arg2  == "Y" || $ch_arg2 == "y" ]]; then
                mkdir $arg2
            else
                echo -e '\r'
                echo -e "Wrong choice"
                exit
            fi
        fi

        echo -e '\r'
        echo -e "Please enter the path for the configuration folder:" 
        read arg3

        if [[ ! -d $arg3 ]]; then
            echo -e '\r'
            echo -e "Attention, the directory doesn't exist, please check the path provided"
        else
            node $directory/init_test_unit.js -U1 -h $arg2 -o $arg3
        fi

        echo -e '\r'
        node $directory/init_test_unit.js -S1 -h $arg2 
        exit
    ;;
    S3)
        echo -e '\r'
        echo -e "Please enter the path for the testing environment:" 
        read arg2

        if [[ ! -d $arg2 ]]; then
            echo -e '\r'
            echo -e "Attention, the directory doesn't exist, do you want to create it? [(Y)es/(A)bort]"
            read ch_arg2
            if [[ $ch_arg2 == "A" || $ch_arg2 == "a" ]]; then 
                exit
            elif  [[ $ch_arg2  == "Y" || $ch_arg2 == "y" ]]; then
                mkdir $arg2
            else
                echo -e '\r'
                echo -e "Wrong choice"
                exit
            fi
        fi

        echo -e '\r'
        echo -e "Please enter the path to the Thingpedia devices you want to work with (main/staging/universe):" 
        read arg4

        if [[ ! -d $arg4 ]]; then
            echo -e '\r'
            echo -e "Attention, the directory doesn't exist, do you want to create it? [(Y)es/(A)bort]"
            read ch_arg2
            if [[ $ch_arg4 == "A" || $ch_arg4 == "a" ]]; then 
                exit
            elif  [[ $ch_arg4  == "Y" || $ch_arg4 == "y" ]]; then
                mkdir $arg4
            else
                echo -e '\r'
                echo -e "Wrong choice"
                exit
            fi
        fi

        echo -e '\r'
        echo -e "Do you want to use all the devices in the folder (F) or provide a list (D)?"
        read arg5
        
        echo -e '\r'
        node $directory/init_test_unit.js -S1 -h $arg2 &

        if [[ $arg5 == "D" || $arg5  == "d" ]]; then
            echo -e '\r'
            echo -e "Please enter the IoT devices to add to the system (i.e. ['dev1','dev2','devn']):" 
            read arg6
            node $directory/init_test_unit.js -U3 -h $arg2 -d $arg6 $arg4
        else 
            node $directory/init_test_unit.js -U3 -h $arg2 -f $arg4
        fi
                 
        exit
    ;;
    M)
    node $directory/init_test_unit.js -M
    ;;
    *)  
        echo -e '\r'
        echo -e "Command not recognized."
        echo -e '\r'
        exit
    ;;
esac