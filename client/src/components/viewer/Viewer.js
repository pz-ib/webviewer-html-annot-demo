import WebViewer from '@pdftron/webviewer';
import { initializeHTMLViewer } from '@pdftron/webviewer-html';
import React, { useContext, useEffect, useRef, useState } from 'react';
import WebViewerContext from '../../context/webviewer';
import './Viewer.css';

const Viewer = ({ res, loadURL }) => {
  const viewer = useRef(null);
  const [HTMLModule, setHTMLModule] = useState(null);
  const { setInstance } = useContext(WebViewerContext);

  const instanceRef = useRef(null);
  const [documentLoaded, setDocumentLoaded] = useState(false);
  const [proxyLoaded, setProxyLoaded] = useState(false);

  useEffect(() => {
    WebViewer(
      {
        path: '/lib',
        disableVirtualDisplayMode: true,
      },
      viewer.current
    ).then(async (instance) => {
      instanceRef.current = instance;

      const { Core } = instance;

      const { annotationManager: annotManager, documentViewer: docViewer } = Core;
      setInstance(instance);

      const license = `---- Insert commercial license key here after purchase ----`;

      // Extends WebViewer to allow loading HTML5 files from URL or static folder.
      const htmlModule = await initializeHTMLViewer(instance, { license });

      setHTMLModule(htmlModule);

      loadURL(`https://view.comms.unimelb.edu.au/?qs=a1cf93ed90c1aebfa0c15cd9b89bc8df9421db2c21904b373a564a0b64de8e8d34b82101558342e652477558725478ed81d932923525c1a456ce8fa398c471f27dea14c4e276e4aa0654aafde9815543`);
      // loadURL(`https://view.comms.unimelb.edu.au/?qs=805390d3bdf7150309460003c77dfbaf753d6d759c52f1aafa611ebea39bf4e8ae2fe35b8cd0ef22222d57ff701c9090fe8ca1940d580147ad0a875c93358642c0c9887aef9820c530f34a87405a8b3c`);
      annotManager.addEventListener(
        'annotationChanged',
        (annotations, action, { imported }) => {
          if (
            imported
          ) {
            return;
          }
          switch (action) {
            case 'add': {
              // Remove auto generated Links in Live url file
              if (annotations?.[0]?.Subject === 'Link') {
                return;
              }

              const newAnnotation = annotations[0];

              annotManager
                .exportAnnotations({
                  widgets: false,
                  links: false,
                  annotList: [newAnnotation],
                })
                .then(annotData => {
                  const existingAnnots = localStorage.getItem('annots');
                  if (!existingAnnots) {
                    localStorage.setItem('annots', JSON.stringify([annotData]));
                    return;
                  }
                  const parsedAnnots = JSON.parse(existingAnnots);
                  localStorage.setItem('annots', JSON.stringify([...parsedAnnots, annotData]));
                });

              break;
            }

            case 'delete': {
              const [annotationToDelete] = annotations;
              
              annotManager.deleteAnnotations([annotationToDelete]);
              break;
            }

            default:
              break;
          }
        }
      );

      docViewer.addEventListener('documentLoaded', () =>
        setDocumentLoaded(true)
      );

      docViewer.addEventListener('proxyLoaded', () => {
        setProxyLoaded(true);
      });

      /* How to proxy with custom HTTP headers */
      // loadURL(`https://www.pdftron.com/`, {
      //   customheaders: JSON.stringify({
      //     Authorization: 'token',
      //     'custom-header': 'custom token',
      //   }),
      //   // invalid values: {}, { key: value }, "random string that can't be parsed"
      // });
    });
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (HTMLModule && Object.keys(res).length > 0) {
      const { iframeUrl, width, height, urlToProxy, disableLinkAnnotations } = res;
      HTMLModule.loadHTMLPage({ iframeUrl, width, height, urlToProxy, disableLinkAnnotations });
    }
  }, [HTMLModule, res]);


  React.useEffect(() => {
    if (
      documentLoaded &&
      instanceRef.current &&
      proxyLoaded
    ) {
      const { annotationManager } = instanceRef.current.Core;
      const existingAnnots = localStorage.getItem('annots');
      if (existingAnnots) {
        const parsedAnnots = JSON.parse(existingAnnots);
        parsedAnnots.forEach(xfdfString => {
          annotationManager.importAnnotations(xfdfString).then(annotations => {
            console.log('imported annot', annotations);
          })
        });
      }
    }
  }, [
    documentLoaded,
    proxyLoaded,
  ]);

  return <div ref={viewer} className="HTMLViewer"></div>;
};

export default Viewer;
