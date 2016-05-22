/*
 * =====================================================================================
 *
 *       Filename:  server.h
 *
 *    Description:	
 *
 *        Version:  1.0
 *        Created:  2016-05-15 12:13:40
 *       Revision:  none
 *       Compiler:  gcc
 *
 *         Author:  DIMOV Theodor, DRAGOMIR Philippe
 *   Organization:  IPL
 *
 * =====================================================================================
 */

#include <time.h>
#include <unistd.h>
#include <errno.h>
#include <arpa/inet.h>
#include <sys/ipc.h>
#include <sys/shm.h>
#include <sys/wait.h>
#include "config.h"
#include "common_utils.h"

#define BUFFER_SIZE 1024
#define BACKLOG 20
#define COUNTDOWN 10 //30 seconds wait time

typedef void (*fct_ptr)( );

void init_server(int*, struct sockaddr_in*); //creates and binds socket
void interrupt_handler(int); //shuts down the server when a SIGINT occurs
void shutdown_socket(int); //closes a given socket
void handle_request(int, struct sockaddr_in*); //adds a client to the fdset
void refuse_connection(int); //refuses a given client's connection request
bool receive_msg(char*, int); //handles incoming messages
char* get_content_type(char*);